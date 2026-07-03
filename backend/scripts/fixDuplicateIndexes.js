/**
 * 通用修复脚本：扫描数据库中所有表，清理 Sequelize alter:true 反复生成的重复 UNIQUE 索引
 *
 * 重复索引特征：同一列存在多个 UNIQUE 索引，命名模式为 baseName, baseName_2, baseName_3 ...
 * 处理策略：每个 (表, 基础索引名) 只保留一个（优先保留无数字后缀的原始索引），删除其余
 */
require('dotenv').config();
const { sequelize } = require('../db');

(async () => {
  try {
    await sequelize.authenticate();
    console.log('数据库连接成功\n');

    // 查询所有表
    const [tables] = await sequelize.query(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE'`
    );

    let totalDropped = 0;

    for (const { TABLE_NAME: table } of tables) {
      const [indexes] = await sequelize.query(`SHOW INDEX FROM \`${table}\``);

      // 按 (基础索引名) 分组
      const indexGroups = new Map();
      indexes.forEach(idx => {
        const name = idx.Key_name;
        if (name === 'PRIMARY') return;
        // 匹配 xxx_2, xxx_23 这种后缀；_ 前面的作为基础名
        const match = name.match(/^(.+)_(\d+)$/);
        const baseName = match ? match[1] : name;
        const key = `${baseName}|${idx.Column_name}`; // 同列、同基础名才视为重复
        if (!indexGroups.has(key)) {
          indexGroups.set(key, []);
        }
        indexGroups.get(key).push({
          name,
          column: idx.Column_name,
          nonUnique: idx.Non_unique,
          seqInIndex: idx.Seq_in_index,
          seq: match ? parseInt(match[2], 10) : 0,
        });
      });

      // 找出需要删除的重复索引
      const toDrop = [];
      indexGroups.forEach(idxs => {
        if (idxs.length <= 1) return;
        // 只处理 UNIQUE 索引（Non_unique=0）的重复
        const uniqueIdxs = idxs.filter(i => i.nonUnique === 0);
        if (uniqueIdxs.length <= 1) return;
        // 按 seq 升序（无后缀优先于_2、_3...），保留第一个
        uniqueIdxs.sort((a, b) => a.seq - b.seq);
        const keeper = uniqueIdxs[0];
        uniqueIdxs.slice(1).forEach(idx => {
          toDrop.push({ table, name: idx.name, keeper: keeper.name, column: idx.column });
        });
      });

      if (toDrop.length > 0) {
        console.log(`[${table}] 发现 ${toDrop.length} 个重复 UNIQUE 索引:`);
        for (const { table: tbl, name, keeper, column } of toDrop) {
          try {
            console.log(`  DROP INDEX \`${name}\` ON \`${tbl}\` (列=${column}, 保留=${keeper})...`);
            await sequelize.query(`DROP INDEX \`${name}\` ON \`${tbl}\``);
            totalDropped++;
            console.log(`    ✓ 已删除`);
          } catch (err) {
            console.log(`    ✗ 失败: ${err.message}`);
          }
        }
      }
    }

    console.log(`\n=== 清理完成，共删除 ${totalDropped} 个重复索引 ===`);

    // 验证：输出各表剩余 UNIQUE 索引情况
    console.log('\n=== 各表剩余 UNIQUE 索引 ===');
    for (const { TABLE_NAME: table } of tables) {
      const [indexes] = await sequelize.query(`SHOW INDEX FROM \`${table}\``);
      const uniqueIdx = indexes.filter(i => i.Non_unique === 0 && i.Key_name !== 'PRIMARY');
      if (uniqueIdx.length === 0) continue;
      const summary = uniqueIdx.map(i => `${i.Key_name}(${i.Column_name})`).join(', ');
      console.log(`${table}: ${summary}`);
    }

    process.exit(0);
  } catch (err) {
    console.error('修复失败:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
})();
