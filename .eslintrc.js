module.exports = {
  root: true,
  // 根配置不直接检查文件，而是作为项目入口
  // 实际检查由 frontend/ 和 backend/ 各自的配置处理
  ignorePatterns: ['frontend/**', 'backend/**', 'node_modules/**', 'dist/**'],
  overrides: []
}
