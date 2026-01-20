const express = require('express');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const User = require('../models/User');
const Role = require('../models/Role');
const UserRole = require('../models/UserRole');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

const SALT_ROUNDS = 10;

const generateId = () => {
  return 'user_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
};

const getWhereClause = (query) => {
  const where = {};
  
  if (query.username) {
    where.username = { [Op.like]: `%${query.username}%` };
  }
  
  if (query.status) {
    where.status = query.status;
  }
  
  if (query.realName) {
    where.realName = { [Op.like]: `%${query.realName}%` };
  }
  
  return where;
};

const { Op } = require('sequelize');

router.get('/', authMiddleware, async (req, res) => {
  try {
    const { page = 1, pageSize = 10, username, status, realName } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    const limit = parseInt(pageSize);

    const where = getWhereClause({ username, status, realName });

    const { count, rows: users } = await User.findAndCountAll({
      where,
      attributes: { exclude: ['password'] },
      limit,
      offset,
      order: [['createdAt', 'DESC']]
    });

    if (users.length > 0) {
      const userIds = users.map(u => u.userId);
      const allUserRoles = await UserRole.findAll({
        include: [{
          model: Role,
          where: { status: 'active' },
          attributes: ['roleId', 'roleName', 'roleCode']
        }],
        where: {
          UserId: { [Op.in]: userIds }
        }
      });

      const userRolesMap = {};
      allUserRoles.forEach(ur => {
        if (!userRolesMap[ur.UserId]) {
          userRolesMap[ur.UserId] = [];
        }
        userRolesMap[ur.UserId].push({
          roleId: ur.Role.roleId,
          roleName: ur.Role.roleName,
          roleCode: ur.Role.roleCode
        });
      });

      users.forEach(user => {
        user.dataValues.roles = userRolesMap[user.userId] || [];
      });
    } else {
      users.forEach(user => {
        user.dataValues.roles = [];
      });
    }

    res.json({
      success: true,
      data: {
        total: count,
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        users
      }
    });
  } catch (error) {
    console.error('获取用户列表错误:', error);
    res.status(500).json({
      success: false,
      message: '获取用户列表失败'
    });
  }
});

router.get('/all', authMiddleware, async (req, res) => {
  try {
    const users = await User.findAll({
      where: { status: 'active' },
      attributes: ['userId', 'username', 'realName', 'email'],
      order: [['realName', 'ASC']]
    });

    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('获取所有用户错误:', error);
    res.status(500).json({
      success: false,
      message: '获取用户列表失败'
    });
  }
});

router.get('/:userId', authMiddleware, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.userId, {
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    const userRoles = await UserRole.findAll({
      include: [{
        model: Role,
        where: { status: 'active' }
      }],
      where: { UserId: user.userId }
    });

    user.dataValues.roles = userRoles.map(ur => ({
      roleId: ur.Role.roleId,
      roleName: ur.Role.roleName,
      roleCode: ur.Role.roleCode
    }));

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('获取用户详情错误:', error);
    res.status(500).json({
      success: false,
      message: '获取用户详情失败'
    });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { username, password, email, phone, realName, roleIds, status, remark } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: '用户名和密码不能为空'
      });
    }

    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: '用户名已存在'
      });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await User.create({
      userId: generateId(),
      username,
      password: hashedPassword,
      email,
      phone,
      realName: realName || username,
      status: status || 'active',
      remark
    });

    if (roleIds && roleIds.length > 0) {
      for (const roleId of roleIds) {
        await UserRole.create({
          UserId: user.userId,
          RoleId: roleId
        });
      }
    }

    res.status(201).json({
      success: true,
      message: '创建成功',
      data: {
        userId: user.userId,
        username: user.username,
        email: user.email,
        realName: user.realName,
        status: user.status
      }
    });
  } catch (error) {
    console.error('创建用户错误:', error);
    res.status(500).json({
      success: false,
      message: '创建用户失败'
    });
  }
});

router.put('/:userId', authMiddleware, async (req, res) => {
  try {
    const { username, email, phone, realName, roleIds, status, remark, newPassword } = req.body;
    const user = await User.findByPk(req.params.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    if (username !== undefined && username !== user.username) {
      const existingUser = await User.findOne({ 
        where: { username, userId: { [Op.ne]: user.userId } } 
      });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: '用户名已存在'
        });
      }
      user.username = username;
    }

    if (email !== undefined) user.email = email;
    if (phone !== undefined) user.phone = phone;
    if (realName !== undefined) user.realName = realName;
    if (status !== undefined) user.status = status;
    if (remark !== undefined) user.remark = remark;

    if (newPassword && newPassword.length >= 6) {
      user.password = await bcrypt.hash(newPassword, SALT_ROUNDS);
    }

    await user.save();

    if (roleIds !== undefined) {
      await UserRole.destroy({ where: { UserId: user.userId } });
      
      for (const roleId of roleIds) {
        await UserRole.create({
          UserId: user.userId,
          RoleId: roleId
        });
      }
    }

    const updatedUser = await User.findByPk(req.params.userId, {
      attributes: { exclude: ['password'] }
    });

    res.json({
      success: true,
      message: '更新成功',
      data: updatedUser
    });
  } catch (error) {
    console.error('更新用户错误:', error);
    res.status(500).json({
      success: false,
      message: '更新用户失败'
    });
  }
});

router.put('/:userId/password', authMiddleware, async (req, res) => {
  try {
    const { newPassword } = req.body;
    const user = await User.findByPk(req.params.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: '密码长度不能少于6个字符'
      });
    }

    user.password = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await user.save();

    res.json({
      success: true,
      message: '密码重置成功'
    });
  } catch (error) {
    console.error('重置密码错误:', error);
    res.status(500).json({
      success: false,
      message: '重置密码失败'
    });
  }
});

router.delete('/:userId', authMiddleware, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    if (user.userId === req.user.userId) {
      return res.status(400).json({
        success: false,
        message: '不能删除当前登录用户'
      });
    }

    await UserRole.destroy({ where: { UserId: user.userId } });
    await user.destroy();

    res.json({
      success: true,
      message: '删除成功'
    });
  } catch (error) {
    console.error('删除用户错误:', error);
    res.status(500).json({
      success: false,
      message: '删除用户失败'
    });
  }
});

router.post('/:userId/avatar', authMiddleware, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    if (!req.files || !req.files.avatar) {
      return res.status(400).json({
        success: false,
        message: '请选择要上传的头像文件'
      });
    }

    const avatarFile = req.files.avatar;
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    
    if (!allowedTypes.includes(avatarFile.mimetype)) {
      return res.status(400).json({
        success: false,
        message: '只支持 JPG、PNG、GIF 和 WebP 格式的图片'
      });
    }

    if (avatarFile.size > 5 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        message: '图片大小不能超过 5MB'
      });
    }

    const uploadDir = path.join(__dirname, '..', 'uploads', 'avatars');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const ext = path.extname(avatarFile.name) || '.jpg';
    const filename = `avatar_${user.userId}_${Date.now()}${ext}`;
    const filepath = path.join(uploadDir, filename);

    await avatarFile.mv(filepath);

    if (user.avatar && user.avatar.startsWith('/uploads/avatars/')) {
      const oldFile = path.join(__dirname, '..', user.avatar);
      if (fs.existsSync(oldFile)) {
        fs.unlinkSync(oldFile);
      }
    }

    const avatarUrl = `/uploads/avatars/${filename}`;
    user.avatar = avatarUrl;
    await user.save();

    res.json({
      success: true,
      message: '头像上传成功',
      data: { avatar: avatarUrl }
    });
  } catch (error) {
    console.error('上传头像错误:', error);
    res.status(500).json({
      success: false,
      message: '上传头像失败'
    });
  }
});

router.delete('/:userId/avatar', authMiddleware, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    if (user.avatar && user.avatar.startsWith('/uploads/avatars/')) {
      const oldFile = path.join(__dirname, '..', user.avatar);
      if (fs.existsSync(oldFile)) {
        fs.unlinkSync(oldFile);
      }
    }

    user.avatar = null;
    await user.save();

    res.json({
      success: true,
      message: '头像删除成功'
    });
  } catch (error) {
    console.error('删除头像错误:', error);
    res.status(500).json({
      success: false,
      message: '删除头像失败'
    });
  }
});

module.exports = router;
