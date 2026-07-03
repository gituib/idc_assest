/**
 * 进一步清理复合索引（之前的脚本只处理单列索引，这里处理复合 UNIQUE 索引重复）
 */
require('dotenv').config();
const { sequelize } = require('../db');

(async () => {
  try {
    await sequelize.authenticate();

    // 需要检查的表及复合唯一索引模式
    const tables = await sequelize.query(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE'`,
      { type: sequelize.QueryTypes.SELECT }
    );

    let totalDropped = 0;

    for (const { TABLE_NAME: table } of tables) {
      const indexes = await sequelize.query(`SHOW INDEX FROM \`${table}\``, {
        type: sequelize.QueryTypes.SELECT,
      });

      // 按 Key_name 分组找出复合索引（同一 Key_name 对应多列）
      const byKeyName = new Map();
      indexes.forEach(idx => {
        if (idx.Key_name === 'PRIMARY') return;
        if (idx.Non_unique !== 0) return; // 只处理 UNIQUE
        if (!byKeyName.has(idx.Key_name)) byKeyName.set(idx.Key_name, []);
        byKeyName.get(idx.Key_name).push(idx);
      });

      // 对复合索引（列数>1），按列集合分组找重复
      const compoundGroups = new Map();
      byKeyName.forEach((cols, keyName) => {
        if (cols.length <= 1) return;
        const colSet = cols
          .sort((a, b) => a.Seq_in_index - b.Seq_in_index)
          .map(c => c.Column_name)
          .join(',');
        if (!compoundGroups.has(colSet)) compoundGroups.set(colSet, []);
        compoundGroups.get(colSet).push(keyName);
      });

      for (const [colSet, keyNames] of compoundGroups) {
        if (keyNames.length <= 1) continue;
        // 保留第一个，删除其他。优先保留名字更简洁/无数字后缀的
        keyNames.sort((a, b) => {
          const aHas = /_\d+$/.test(a);
          const bHas = /_\d+$/.test(b);
          if (aHas && !bHas) return 1;
          if (!aHas && bHas) return -1;
          return a.length - b.length;
        });
        const keep = keyNames[0];
        for (const name of keyNames.slice(1)) {
          try {
            console.log(`[${table}] DROP INDEX \`${name}\` (复合列=${colSet}, 保留=${keep})`);
            await sequelize.query(`DROP INDEX \`${name}\` ON \`${table}\``);
            totalDropped++;
            console.log(`  ✓ 已删除`);
          } catch (err) {
            console.log(`  ✗ 失败: ${err.message}`);
          }
        }
      }
    }

    console.log(`\n共删除 ${totalDropped} 个重复复合 UNIQUE 索引`);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
