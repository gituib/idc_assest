const { sequelize } = require('./db');
const FaultCategory = require('./models/FaultCategory');

async function recreateFaultCategoryTable() {
  try {
    console.log('开始重建故障分类表...');
    
    await sequelize.authenticate();
    console.log('数据库连接成功');
    
    // 删除旧表并创建新表
    await sequelize.query('DROP TABLE IF EXISTS fault_categories');
    console.log('旧表已删除');
    
    await FaultCategory.sync();
    console.log('新表已创建');
    
    // 初始化默认分类
    const defaultCategories = [
      { name: '系统故障', description: '操作系统、应用程序等系统软件的故障问题', priority: 1, defaultPriority: 'high', expectedDuration: 120, isSystem: true, isActive: true },
      { name: '硬件故障', description: '物理设备、服务器、存储等硬件设备的故障问题', priority: 2, defaultPriority: 'high', expectedDuration: 180, isSystem: true, isActive: true },
      { name: '网络故障', description: '网络连接、交换机、路由器等网络相关故障', priority: 3, defaultPriority: 'high', expectedDuration: 120, isSystem: true, isActive: true },
      { name: '软件故障', description: '应用程序错误、软件兼容性等问题', priority: 4, defaultPriority: 'medium', expectedDuration: 90, isSystem: true, isActive: true },
      { name: '安全事件', description: '安全漏洞、入侵检测、权限异常等安全问题', priority: 5, defaultPriority: 'urgent', expectedDuration: 60, isSystem: true, isActive: true },
      { name: '性能问题', description: '系统响应慢、资源利用率高等性能问题', priority: 6, defaultPriority: 'medium', expectedDuration: 120, isSystem: true, isActive: true },
      { name: '配置变更', description: '系统配置、软件配置等变更需求', priority: 7, defaultPriority: 'low', expectedDuration: 60, isSystem: true, isActive: true },
      { name: '例行维护', description: '定期维护、巡检、更新等计划性工作', priority: 8, defaultPriority: 'low', expectedDuration: 120, isSystem: true, isActive: true },
      { name: '数据问题', description: '数据错误、数据丢失、数据同步等数据相关问题', priority: 9, defaultPriority: 'high', expectedDuration: 150, isSystem: true, isActive: true },
      { name: '其他问题', description: '无法归类的其他问题', priority: 99, defaultPriority: 'medium', expectedDuration: 90, isSystem: true, isActive: true }
    ];

    for (const cat of defaultCategories) {
      const categoryId = `CAT${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
      await FaultCategory.create({
        categoryId,
        ...cat,
        solutions: [],
        metadata: {}
      });
    }
    console.log('默认分类已初始化');
    
    console.log('故障分类表重建完成！');
    process.exit(0);
  } catch (error) {
    console.error('操作失败:', error);
    process.exit(1);
  }
}

recreateFaultCategoryTable();
