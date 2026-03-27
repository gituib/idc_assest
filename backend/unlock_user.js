const { sequelize } = require('./db');
const User = require('./models/User');

async function unlockUser(username = null) {
  try {
    await sequelize.authenticate();
    console.log('数据库连接成功！\n');

    let users;
    if (username) {
      // 解锁指定用户
      users = await User.findAll({
        where: {
          username,
          status: 'locked',
        },
      });

      if (users.length === 0) {
        console.log(`未找到被锁定的用户: ${username}`);
        const user = await User.findOne({ where: { username } });
        if (user) {
          console.log(`该用户当前状态: ${user.status}`);
        }
        await sequelize.close();
        return;
      }
    } else {
      // 解锁所有被锁定的用户
      users = await User.findAll({
        where: { status: 'locked' },
      });

      if (users.length === 0) {
        console.log('没有被锁定的用户');
        await sequelize.close();
        return;
      }
    }

    console.log('准备解锁以下用户:');
    users.forEach(user => {
      console.log(`- ${user.username} (${user.userId})`);
    });
    console.log('');

    // 执行解锁操作
    for (const user of users) {
      user.status = 'active';
      user.loginCount = 0;
      await user.save();
      console.log(`✓ 已解锁: ${user.username}`);
    }

    console.log('\n========================================');
    console.log(`解锁完成！共解锁 ${users.length} 个用户`);
    console.log('========================================');

    await sequelize.close();
  } catch (error) {
    console.error('解锁过程中发生错误:', error.message);
    await sequelize.close();
  }
}

// 获取命令行参数
const username = process.argv[2] || null;

unlockUser(username);
