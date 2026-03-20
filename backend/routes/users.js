const express = require('express');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const User = require('../models/User');
const Role = require('../models/Role');
const UserRole = require('../models/UserRole');
const { authMiddleware } = require('../middleware/auth');
const { SALT_ROUNDS, PASSWORD_MIN_LENGTH, FILE_UPLOAD, PAGINATION } = require('../config');
const { logUserOperation } = require('../utils/operationLogger');

const router = express.Router();

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

const getUserRoleIds = async (userId) => {
  const userRoles = await UserRole.findAll({
    where: { UserId: userId },
    attributes: ['RoleId']
  });
  return userRoles.map(ur => ur.RoleId);
};

const { Op } = require('sequelize');

router.get('/', authMiddleware, async (req, res) => {
  try {
    const { page = 1, pageSize = PAGINATION.DEFAULT_PAGE_SIZE, username, status, realName } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    const limit = Math.min(parseInt(pageSize), PAGINATION.MAX_PAGE_SIZE);

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

    const roleNames = roleIds && roleIds.length > 0
      ? (await Role.findAll({ where: { roleId: { [Op.in]: roleIds } } })).map(r => r.roleName).join('、')
      : '未分配角色';

    await logUserOperation('create', `创建用户【${username}】（姓名：${realName || '未填写'}，邮箱：${email || '未填写'}，角色：${roleNames}）`, {
      targetId: user.userId,
      targetName: username,
      afterState: {
        username: user.username,
        email: user.email,
        realName: user.realName,
        status: user.status
      },
      req,
      metadata: { roleIds, roleNames }
    });

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

    const beforeState = {
      username: user.username,
      email: user.email,
      phone: user.phone,
      realName: user.realName,
      status: user.status,
      remark: user.remark
    };

    const oldRoleIds = roleIds !== undefined ? null : await getUserRoleIds(user.userId);

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

    if (newPassword && newPassword.length >= PASSWORD_MIN_LENGTH) {
      user.password = await bcrypt.hash(newPassword, SALT_ROUNDS);
    }

    await user.save();

    let permissionChanged = false;
    let oldRoleNames = [];
    let newRoleNames = [];

    if (roleIds !== undefined) {
      const oldRoles = await Role.findAll({ where: { roleId: { [Op.in]: oldRoleIds || [] } } });
      oldRoleNames = oldRoles.map(r => r.roleName);

      await UserRole.destroy({ where: { UserId: user.userId } });

      for (const roleId of roleIds) {
        await UserRole.create({
          UserId: user.userId,
          RoleId: roleId
        });
      }

      const newRoles = await Role.findAll({ where: { roleId: { [Op.in]: roleIds } } });
      newRoleNames = newRoles.map(r => r.roleName);
      permissionChanged = true;
    }

    const updatedUser = await User.findByPk(req.params.userId, {
      attributes: { exclude: ['password'] }
    });

    if (permissionChanged) {
      const roleChangeDesc = `变更用户【${updatedUser.username}】的角色：${oldRoleNames.join('、') || '无'} → ${newRoleNames.join('、') || '无'}`;
      await logUserOperation('permission_change', roleChangeDesc, {
        targetId: updatedUser.userId,
        targetName: updatedUser.username,
        beforeState: { ...beforeState, roleIds: oldRoleIds, roleNames: oldRoleNames },
        afterState: { ...beforeState, roleIds, roleNames: newRoleNames },
        req,
        metadata: { oldRoleIds, newRoleIds: roleIds, oldRoleNames, newRoleNames }
      });
    } else {
      const afterState = {
        username: updatedUser.username,
        email: updatedUser.email,
        phone: updatedUser.phone,
        realName: updatedUser.realName,
        status: updatedUser.status,
        remark: updatedUser.remark
      };

      const changedFields = {};
      for (const key of Object.keys(beforeState)) {
        if (JSON.stringify(beforeState[key]) !== JSON.stringify(afterState[key])) {
          changedFields[key] = { from: beforeState[key], to: afterState[key] };
        }
      }

      const changeDetails = Object.entries(changedFields).map(([field, values]) => {
        const fieldNames = {
          username: '用户名', email: '邮箱', phone: '电话', realName: '姓名',
          status: '状态', remark: '备注'
        };
        const displayName = fieldNames[field] || field;
        return `${displayName}: ${values.from ?? '空'} → ${values.to ?? '空'}`;
      }).join('；');

      const updateDesc = changeDetails
        ? `更新用户【${updatedUser.username}】：${changeDetails}`
        : `更新用户【${updatedUser.username}】`;

      await logUserOperation('update', updateDesc, {
        targetId: updatedUser.userId,
        targetName: updatedUser.username,
        beforeState,
        afterState,
        req,
        metadata: { changedFields }
      });
    }

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

    if (!newPassword || newPassword.length < PASSWORD_MIN_LENGTH) {
      return res.status(400).json({
        success: false,
        message: `密码长度不能少于${PASSWORD_MIN_LENGTH}个字符`
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

    const userName = user.username;
    const userRealName = user.realName;
    const userEmail = user.email;
    const beforeState = {
      username: user.username,
      email: user.email,
      realName: user.realName,
      status: user.status
    };

    await UserRole.destroy({ where: { UserId: user.userId } });
    await user.destroy();

    await logUserOperation('delete', `删除用户【${userName}】（姓名：${userRealName || '未填写'}，邮箱：${userEmail || '未填写'}）`, {
      targetId: req.params.userId,
      targetName: userName,
      beforeState,
      req,
      metadata: { deletedUsername: userName, realName: userRealName, email: userEmail }
    });

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

    if (avatarFile.size > FILE_UPLOAD.MAX_AVATAR_SIZE) {
      return res.status(400).json({
        success: false,
        message: `图片大小不能超过 ${FILE_UPLOAD.MAX_AVATAR_SIZE / 1024 / 1024}MB`
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

router.put('/:userId/approve', authMiddleware, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    if (user.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: '该用户不在待审核状态'
      });
    }

    user.status = 'active';
    await user.save();

    res.json({
      success: true,
      message: '用户审核通过',
      data: {
        userId: user.userId,
        username: user.username,
        status: user.status
      }
    });
  } catch (error) {
    console.error('审核用户错误:', error);
    res.status(500).json({
      success: false,
      message: '审核用户失败'
    });
  }
});

router.put('/:userId/reject', authMiddleware, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    if (user.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: '该用户不在待审核状态'
      });
    }

    user.status = 'inactive';
    await user.save();

    res.json({
      success: true,
      message: '已拒绝该用户的注册申请',
      data: {
        userId: user.userId,
        username: user.username,
        status: user.status
      }
    });
  } catch (error) {
    console.error('拒绝用户错误:', error);
    res.status(500).json({
      success: false,
      message: '操作失败'
    });
  }
});

module.exports = router;
