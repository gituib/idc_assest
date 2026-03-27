const express = require('express');
const Role = require('../models/Role');
const Permission = require('../models/Permission');
const UserRole = require('../models/UserRole');
const User = require('../models/User');
const { authMiddleware } = require('../middleware/auth');
const { logRoleOperation } = require('../utils/operationLogger');

const router = express.Router();

const generateId = () => {
  return 'role_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
};

const { Op } = require('sequelize');

router.get('/', authMiddleware, async (req, res) => {
  try {
    const { page = 1, pageSize = 10, roleName, status } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    const limit = parseInt(pageSize);

    const where = {};
    if (roleName) {
      where.roleName = { [Op.like]: `%${roleName}%` };
    }
    if (status) {
      where.status = status;
    }

    const { count, rows: roles } = await Role.findAndCountAll({
      where,
      limit,
      offset,
      order: [
        ['sort', 'ASC'],
        ['createdAt', 'DESC'],
      ],
    });

    res.json({
      success: true,
      data: {
        total: count,
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        roles,
      },
    });
  } catch (error) {
    console.error('获取角色列表错误:', error);
    res.status(500).json({
      success: false,
      message: '获取角色列表失败',
    });
  }
});

router.get('/all', authMiddleware, async (req, res) => {
  try {
    const roles = await Role.findAll({
      where: { status: 'active' },
      order: [['sort', 'ASC']],
    });

    res.json({
      success: true,
      data: roles,
    });
  } catch (error) {
    console.error('获取所有角色错误:', error);
    res.status(500).json({
      success: false,
      message: '获取角色列表失败',
    });
  }
});

router.get('/:roleId', authMiddleware, async (req, res) => {
  try {
    const role = await Role.findByPk(req.params.roleId);

    if (!role) {
      return res.status(404).json({
        success: false,
        message: '角色不存在',
      });
    }

    const permissions = await Permission.findAll({
      where: { status: 'active' },
      order: [['sort', 'ASC']],
    });

    res.json({
      success: true,
      data: {
        role,
        permissions,
        rolePermissions: role.permissions || [],
      },
    });
  } catch (error) {
    console.error('获取角色详情错误:', error);
    res.status(500).json({
      success: false,
      message: '获取角色详情失败',
    });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { roleName, roleCode, description, permissions, status, sort } = req.body;

    if (!roleName || !roleCode) {
      return res.status(400).json({
        success: false,
        message: '角色名称和角色编码不能为空',
      });
    }

    const existingRole = await Role.findOne({ where: { roleCode } });
    if (existingRole) {
      return res.status(400).json({
        success: false,
        message: '角色编码已存在',
      });
    }

    const role = await Role.create({
      roleId: generateId(),
      roleName,
      roleCode,
      description,
      permissions: permissions || [],
      status: status || 'active',
      sort: sort || 0,
    });

    const permissionNames = permissions && permissions.length > 0 ? permissions.join('、') : '无';

    await logRoleOperation(
      'create',
      `创建角色【${roleName}】（编码：${roleCode}，权限：${permissionNames}）`,
      {
        targetId: role.roleId,
        targetName: roleName,
        afterState: role.toJSON(),
        req,
        metadata: { roleCode, permissions, permissionNames },
      }
    );

    res.status(201).json({
      success: true,
      message: '创建成功',
      data: role,
    });
  } catch (error) {
    console.error('创建角色错误:', error);
    res.status(500).json({
      success: false,
      message: '创建角色失败',
    });
  }
});

router.put('/:roleId', authMiddleware, async (req, res) => {
  try {
    const { roleName, description, permissions, status, sort } = req.body;
    const role = await Role.findByPk(req.params.roleId);

    if (!role) {
      return res.status(404).json({
        success: false,
        message: '角色不存在',
      });
    }

    const beforeState = role.toJSON();

    if (roleName !== undefined) {
      role.roleName = roleName;
    }
    if (description !== undefined) {
      role.description = description;
    }
    if (permissions !== undefined) {
      role.permissions = permissions;
    }
    if (status !== undefined) {
      role.status = status;
    }
    if (sort !== undefined) {
      role.sort = sort;
    }

    await role.save();

    const afterState = role.toJSON();
    const changedFields = {};

    if (roleName !== undefined && beforeState.roleName !== roleName) {
      changedFields.roleName = { from: beforeState.roleName, to: roleName };
    }
    if (description !== undefined && beforeState.description !== description) {
      changedFields.description = { from: beforeState.description, to: description };
    }
    if (permissions !== undefined) {
      const oldPerms = (beforeState.permissions || []).sort().join(',');
      const newPerms = (permissions || []).sort().join(',');
      if (oldPerms !== newPerms) {
        changedFields.permissions = { from: beforeState.permissions, to: permissions };
      }
    }
    if (status !== undefined && beforeState.status !== status) {
      const statusText = { active: '启用', inactive: '禁用' };
      changedFields.status = {
        from: beforeState.status,
        to: status,
        fromText: statusText[beforeState.status],
        toText: statusText[status],
      };
    }

    const changeDetails = Object.entries(changedFields)
      .map(([field, values]) => {
        const fieldNames = {
          roleName: '角色名称',
          description: '描述',
          permissions: '权限',
          status: '状态',
        };
        const displayName = fieldNames[field] || field;

        if (field === 'permissions') {
          return `权限: ${(values.from || []).join('、') || '无'} → ${(values.to || []).join('、') || '无'}`;
        }
        if (field === 'status') {
          return `状态: ${values.fromText} → ${values.toText}`;
        }
        return `${displayName}: ${values.from ?? '空'} → ${values.to ?? '空'}`;
      })
      .join('；');

    const updateDesc = changeDetails
      ? `更新角色【${role.roleName}】：${changeDetails}`
      : `更新角色【${role.roleName}】`;

    await logRoleOperation('update', updateDesc, {
      targetId: role.roleId,
      targetName: role.roleName,
      beforeState,
      afterState,
      req,
      metadata: {
        changedFields,
        oldRoleName: beforeState.roleName,
        oldPermissions: beforeState.permissions,
      },
    });

    res.json({
      success: true,
      message: '更新成功',
      data: role,
    });
  } catch (error) {
    console.error('更新角色错误:', error);
    res.status(500).json({
      success: false,
      message: '更新角色失败',
    });
  }
});

router.delete('/:roleId', authMiddleware, async (req, res) => {
  try {
    const role = await Role.findByPk(req.params.roleId);

    if (!role) {
      return res.status(404).json({
        success: false,
        message: '角色不存在',
      });
    }

    if (role.roleCode === 'admin') {
      return res.status(400).json({
        success: false,
        message: '不能删除管理员角色',
      });
    }

    const userCount = await UserRole.count({ where: { RoleId: role.roleId } });
    if (userCount > 0) {
      return res.status(400).json({
        success: false,
        message: '该角色下有用户，不能删除',
      });
    }

    const roleName = role.roleName;
    const roleCode = role.roleCode;
    const beforeState = role.toJSON();

    await role.destroy();

    await logRoleOperation(
      'delete',
      `删除角色【${roleName}】（编码：${roleCode}，权限：${(role.permissions || []).join('、') || '无'}）`,
      {
        targetId: req.params.roleId,
        targetName: roleName,
        beforeState,
        req,
        metadata: { roleCode, userCount, permissions: role.permissions },
      }
    );

    res.json({
      success: true,
      message: '删除成功',
    });
  } catch (error) {
    console.error('删除角色错误:', error);
    res.status(500).json({
      success: false,
      message: '删除角色失败',
    });
  }
});

router.post('/init-roles', async (req, res) => {
  try {
    const defaultRoles = [
      {
        roleId: 'role_admin',
        roleName: '管理员',
        roleCode: 'admin',
        description: '系统管理员，拥有所有权限',
        permissions: ['*'],
        status: 'active',
        sort: 1,
      },
      {
        roleId: 'role_operator',
        roleName: '运维人员',
        roleCode: 'operator',
        description: '负责日常运维操作',
        permissions: [
          'devices:read',
          'devices:write',
          'racks:read',
          'rooms:read',
          'consumables:read',
          'consumables:write',
        ],
        status: 'active',
        sort: 2,
      },
      {
        roleId: 'role_viewer',
        roleName: '只读用户',
        roleCode: 'viewer',
        description: '仅能查看数据',
        permissions: ['devices:read', 'racks:read', 'rooms:read', 'consumables:read'],
        status: 'active',
        sort: 3,
      },
    ];

    for (const roleData of defaultRoles) {
      await Role.upsert(roleData);
    }

    res.json({
      success: true,
      message: '初始化角色成功',
    });
  } catch (error) {
    console.error('初始化角色错误:', error);
    res.status(500).json({
      success: false,
      message: '初始化角色失败',
    });
  }
});

module.exports = router;
