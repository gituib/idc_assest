const { sequelize } = require('../db');

async function migrate() {
  try {
    console.log('开始迁移：添加 pending 状态到用户表...');

    const queryInterface = sequelize.getQueryInterface();
    const dialect = sequelize.getDialect();

    if (dialect === 'sqlite') {
      // SQLite 不支持 ALTER COLUMN，需要重建表
      console.log('检测到 SQLite 数据库，使用重建表方式迁移...');

      // 1. 创建新表
      await queryInterface.createTable('users_new', {
        userId: {
          type: sequelize.Sequelize.STRING,
          primaryKey: true,
          allowNull: false
        },
        username: {
          type: sequelize.Sequelize.STRING,
          allowNull: false,
          unique: true
        },
        password: {
          type: sequelize.Sequelize.STRING,
          allowNull: false
        },
        email: {
          type: sequelize.Sequelize.STRING,
          allowNull: true
        },
        phone: {
          type: sequelize.Sequelize.STRING,
          allowNull: true
        },
        realName: {
          type: sequelize.Sequelize.STRING,
          allowNull: true
        },
        avatar: {
          type: sequelize.Sequelize.STRING,
          allowNull: true
        },
        status: {
          type: sequelize.Sequelize.ENUM('active', 'inactive', 'locked', 'pending'),
          defaultValue: 'active'
        },
        lastLoginTime: {
          type: sequelize.Sequelize.DATE,
          allowNull: true
        },
        lastLoginIp: {
          type: sequelize.Sequelize.STRING,
          allowNull: true
        },
        loginCount: {
          type: sequelize.Sequelize.INTEGER,
          defaultValue: 0
        },
        remark: {
          type: sequelize.Sequelize.TEXT,
          allowNull: true
        },
        createdAt: {
          type: sequelize.Sequelize.DATE,
          allowNull: false
        },
        updatedAt: {
          type: sequelize.Sequelize.DATE,
          allowNull: false
        }
      });

      // 2. 复制数据
      await sequelize.query(`
        INSERT INTO users_new (
          userId, username, password, email, phone, realName, avatar,
          status, lastLoginTime, lastLoginIp, loginCount, remark, createdAt, updatedAt
        )
        SELECT
          userId, username, password, email, phone, realName, avatar,
          status, lastLoginTime, lastLoginIp, loginCount, remark, createdAt, updatedAt
        FROM users
      `);

      // 3. 删除旧表
      await queryInterface.dropTable('users');

      // 4. 重命名新表
      await queryInterface.renameTable('users_new', 'users');

      // 5. 重新创建索引
      await queryInterface.addIndex('users', ['status']);
      await queryInterface.addIndex('users', ['username']);
      await queryInterface.addIndex('users', ['email']);

      console.log('SQLite 迁移完成');
    } else if (dialect === 'mysql') {
      // MySQL 可以直接修改 ENUM
      console.log('检测到 MySQL 数据库，直接修改 ENUM...');
      await sequelize.query(`
        ALTER TABLE users
        MODIFY COLUMN status ENUM('active', 'inactive', 'locked', 'pending') DEFAULT 'active'
      `);
      console.log('MySQL 迁移完成');
    } else {
      console.log(`不支持的数据库类型: ${dialect}，请手动迁移`);
    }

    console.log('迁移成功完成！');
  } catch (error) {
    console.error('迁移失败:', error);
    process.exit(1);
  }
}

migrate();
