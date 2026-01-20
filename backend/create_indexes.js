const { sequelize } = require('./db');

const createIndexes = async () => {
  const queryInterface = sequelize.getQueryInterface();

  console.log('开始创建数据库索引...');

  try {
    // Device 表索引
    console.log('创建 devices 表索引...');
    await queryInterface.addIndex('devices', ['status']);
    await queryInterface.addIndex('devices', ['type']);
    await queryInterface.addIndex('devices', ['rackId']);
    await queryInterface.addIndex('devices', ['createdAt']);
    await queryInterface.addIndex('devices', ['status', 'type']);
    await queryInterface.addIndex('devices', ['name']);
    console.log('  ✓ devices 表索引创建完成');

    // User 表索引
    console.log('创建 users 表索引...');
    await queryInterface.addIndex('users', ['status']);
    await queryInterface.addIndex('users', ['username']);
    await queryInterface.addIndex('users', ['email']);
    console.log('  ✓ users 表索引创建完成');

    // Consumable 表索引
    console.log('创建 consumables 表索引...');
    await queryInterface.addIndex('consumables', ['category']);
    await queryInterface.addIndex('consumables', ['status']);
    await queryInterface.addIndex('consumables', ['category', 'status']);
    console.log('  ✓ consumables 表索引创建完成');

    // ConsumableRecord 表索引
    console.log('创建 consumable_records 表索引...');
    await queryInterface.addIndex('consumable_records', ['consumableId']);
    await queryInterface.addIndex('consumable_records', ['type']);
    await queryInterface.addIndex('consumable_records', ['createdAt']);
    console.log('  ✓ consumable_records 表索引创建完成');

    // ConsumableLog 表索引
    console.log('创建 consumable_logs 表索引...');
    await queryInterface.addIndex('consumable_logs', ['consumableId']);
    await queryInterface.addIndex('consumable_logs', ['operationType']);
    await queryInterface.addIndex('consumable_logs', ['createdAt']);
    await queryInterface.addIndex('consumable_logs', ['consumableId', 'createdAt']);
    console.log('  ✓ consumable_logs 表索引创建完成');

    // OperationLog 表索引
    console.log('创建 operation_logs 表索引...');
    await queryInterface.addIndex('operation_logs', ['userId']);
    await queryInterface.addIndex('operation_logs', ['action']);
    await queryInterface.addIndex('operation_logs', ['module']);
    await queryInterface.addIndex('operation_logs', ['createdAt']);
    await queryInterface.addIndex('operation_logs', ['userId', 'createdAt']);
    console.log('  ✓ operation_logs 表索引创建完成');

    // LoginHistory 表索引
    console.log('创建 login_histories 表索引...');
    await queryInterface.addIndex('login_histories', ['userId']);
    await queryInterface.addIndex('login_histories', ['loginTime']);
    await queryInterface.addIndex('login_histories', ['loginType']);
    await queryInterface.addIndex('login_histories', ['userId', 'loginTime']);
    console.log('  ✓ login_histories 表索引创建完成');

    // Rack 表索引
    console.log('创建 racks 表索引...');
    await queryInterface.addIndex('racks', ['roomId']);
    await queryInterface.addIndex('racks', ['status']);
    await queryInterface.addIndex('racks', ['roomId', 'status']);
    console.log('  ✓ racks 表索引创建完成');

    // Room 表索引
    console.log('创建 rooms 表索引...');
    await queryInterface.addIndex('rooms', ['status']);
    await queryInterface.addIndex('rooms', ['name']);
    console.log('  ✓ rooms 表索引创建完成');

    console.log('\n✅ 所有索引创建完成！');

  } catch (error) {
    console.error('创建索引失败:', error.message);
    throw error;
  }
};

const checkIndexes = async () => {
  const queryInterface = sequelize.getQueryInterface();
  const tables = [
    'devices', 'users', 'consumables', 'consumable_records',
    'consumable_logs', 'operation_logs', 'login_histories',
    'racks', 'rooms'
  ];

  console.log('\n检查现有索引...');
  for (const table of tables) {
    try {
      const indexes = await queryInterface.showIndex(table);
      console.log(`\n${table} 表索引:`);
      indexes.forEach(idx => {
        console.log(`  - ${idx.name}: [${idx.fields.join(', ')}]`);
      });
    } catch (error) {
      console.log(`  ${table} 表检查失败: ${error.message}`);
    }
  }
};

const dropIndexes = async () => {
  const queryInterface = sequelize.getQueryInterface();

  console.log('开始删除自定义索引...');

  try {
    const indexDefinitions = [
      { table: 'devices', indexes: ['status', 'type', 'rackId', 'createdAt', 'status_type', 'name'] },
      { table: 'users', indexes: ['status', 'username', 'email'] },
      { table: 'consumables', indexes: ['category', 'status', 'category_status'] },
      { table: 'consumable_records', indexes: ['consumableId', 'type', 'createdAt'] },
      { table: 'consumable_logs', indexes: ['consumableId', 'operationType', 'createdAt', 'consumableId_createdAt'] },
      { table: 'operation_logs', indexes: ['userId', 'action', 'module', 'createdAt', 'userId_createdAt'] },
      { table: 'login_histories', indexes: ['userId', 'loginTime', 'loginType', 'userId_loginTime'] },
      { table: 'racks', indexes: ['roomId', 'status', 'roomId_status'] },
      { table: 'rooms', indexes: ['status', 'name'] }
    ];

    for (const def of indexDefinitions) {
      console.log(`处理 ${def.table} 表...`);
      const existingIndexes = await queryInterface.showIndex(def.table);
      for (const existing of existingIndexes) {
        if (def.indexes.includes(existing.name)) {
          await queryInterface.removeIndex(def.table, existing.name);
          console.log(`  ✓ 删除索引: ${existing.name}`);
        }
      }
    }

    console.log('\n✅ 索引删除完成！');
  } catch (error) {
    console.error('删除索引失败:', error.message);
    throw error;
  }
};

module.exports = { createIndexes, checkIndexes, dropIndexes };

if (require.main === module) {
  const command = process.argv[2] || 'create';

  sequelize.authenticate()
    .then(async () => {
      console.log('数据库连接成功\n');
      if (command === 'check') {
        await checkIndexes();
      } else if (command === 'drop') {
        await dropIndexes();
      } else {
        await createIndexes();
      }
      await sequelize.close();
    })
    .catch(err => {
      console.error('数据库连接失败:', err.message);
      process.exit(1);
    });
}
