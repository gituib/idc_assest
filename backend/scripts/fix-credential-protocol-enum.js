/**
 * 一次性修复脚本：device_credentials.protocol 的 ENUM 定义缺 'redfish'
 *
 * 背景：模型 DeviceCredential.protocol 已定义为
 * ENUM('ssh','snmp','telnet','api','redfish')，但数据库表的列类型停留在
 * 旧定义（sequelize.sync({alter:false}) 与 safeSync 的 ADD COLUMN 均不会
 * 修改已存在列的类型），新增 redfish 凭据时报：
 *   Data truncated for column 'protocol' at row 1
 *
 * 幂等：当前定义已与模型一致时直接跳过。
 * 注意：server.js 的 safeSync 现已支持 ENUM 自动同步，本脚本仅用于
 * 不等重启、立即修复既有环境。
 *
 * 用法：node scripts/fix-credential-protocol-enum.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { sequelize } = require('../db');
const { parseDbEnumValues, planEnumSync } = require('../utils/schemaUtils');
const DeviceCredential = require('../models/DeviceCredential');

(async () => {
  const tableName = DeviceCredential.getTableName();
  const attr = DeviceCredential.rawAttributes.protocol;
  const modelValues = (attr.type && attr.type.values) || [];

  try {
    const qi = sequelize.getQueryInterface();
    const tableDesc = await qi.describeTable(tableName);
    const dbValues = parseDbEnumValues(tableDesc.protocol.type);
    const plan = planEnumSync(modelValues, dbValues);

    if (!plan.needsSync) {
      console.log(`protocol 无需同步（reason: ${plan.reason}），当前 DB 定义: [${dbValues.join(',')}]`);
    } else {
      console.log(`修复前 DB 定义: [${dbValues.join(',')}]`);
      console.log(`模型目标定义:   [${modelValues.join(',')}]`);

      const valuesSql = modelValues.map((v) => `'${String(v).replace(/'/g, "''")}'`).join(', ');
      const nullSql = attr.allowNull === false ? 'NOT NULL' : 'NULL';
      const defaultSql =
        attr.defaultValue !== undefined
          ? ` DEFAULT '${String(attr.defaultValue).replace(/'/g, "''")}'`
          : '';
      await sequelize.query(
        `ALTER TABLE \`${tableName}\` MODIFY COLUMN \`protocol\` ENUM(${valuesSql}) ${nullSql}${defaultSql}`
      );

      const after = await qi.describeTable(tableName);
      console.log(`修复后 DB 定义: [${parseDbEnumValues(after.protocol.type).join(',')}]`);
    }

    // 验证：在事务中试插一条 redfish 凭据并回滚，不落任何数据
    const [devices] = await sequelize.query('SELECT deviceId FROM devices LIMIT 1');
    if (devices.length > 0) {
      const t = await sequelize.transaction();
      try {
        const cred = await DeviceCredential.create(
          {
            deviceId: devices[0].deviceId,
            protocol: 'redfish',
            host: '10.255.255.254',
            port: 443,
            username: 'admin',
            password: 'verify-only',
          },
          { transaction: t }
        );
        console.log(`验证通过：redfish 凭据可正常插入（${cred.credentialId}，已回滚未落库）`);
      } finally {
        await t.rollback();
      }
    } else {
      console.log('devices 表为空，跳过插入验证（列定义已修复）');
    }

    await sequelize.close();
  } catch (error) {
    console.error('修复失败:', error.message);
    process.exit(1);
  }
})();
