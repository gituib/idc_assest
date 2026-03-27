/**
 * 安全相关配置常量
 * 集中管理密码加密、登录限制等安全配置
 */

module.exports = {
  SALT_ROUNDS: parseInt(process.env.SALT_ROUNDS, 10) || 10,

  MAX_LOGIN_ATTEMPTS: parseInt(process.env.MAX_LOGIN_ATTEMPTS, 10) || 5,

  LOCK_TIME: (parseInt(process.env.LOCK_TIME_MINUTES, 10) || 30) * 60 * 1000,

  TOKEN_EXPIRY: process.env.TOKEN_EXPIRY || '24h',

  PASSWORD_MIN_LENGTH: parseInt(process.env.PASSWORD_MIN_LENGTH, 10) || 6,

  USERNAME_MIN_LENGTH: parseInt(process.env.USERNAME_MIN_LENGTH, 10) || 3,
  USERNAME_MAX_LENGTH: parseInt(process.env.USERNAME_MAX_LENGTH, 10) || 50,
};
