process.env.JWT_SECRET = 'test-secret-key-for-jest-testing-minimum-32-chars-long';
process.env.NODE_ENV = 'test';
process.env.DB_TYPE = 'sqlite';
// 测试使用内存数据库，避免污染开发数据库文件
// 注意：环境变量名必须与 db.js 中一致（DB_PATH），否则会被忽略
process.env.DB_PATH = ':memory:';
