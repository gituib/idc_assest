### 项目专属规则
项目初始化：React+TS 优先用 Vite 创建（npm create vite@latest），默认配置 ESLint+Prettier，锁定包管理器为 pnpm。
目录规范：src 下分 api/（接口）、components/（通用组件）、pages/（页面）、assets/（静态资源）、utils/（工具函数），禁止多层嵌套。
版本管理：用 nvm 锁定 Node.js LTS 版本（如 v20.10.0），package.json 标注依赖版本（如 react@18.2.0），提交前执行 pnpm lint 校验。分支管理：主分支 main/develop，功能分支 feature/xxx，修复分支 fix/xxx，合并前必须通过单元测试（vitest 覆盖率≥80%）。
静态资源：public 目录仅存无需打包的静态文件，src/assets 资源 import 引入，大文件（>1MB）用懒加载+CDN 备选方案。
构建部署：本地构建 npm run build，生产环境加 --mode production，输出目录 dist 适配 Nginx 部署，配置 gzip 压缩。
 文档要求：项目根目录必须有 README.md（含启动/部署步骤）、CHANGELOG.md（版本迭代记录），接口文档放 docs/api 目录。
性能监控：接入 web-vitals 监测首屏加载/交互延迟，打包后用 bundle-analyzer 分析体积，按需拆分 chunk。
环境配置：区分 .env.development/.env.production，敏感配置通过环境变量注入，禁止硬编码密钥。
迭代规范：需求拆分按「原子化功能」，单分支迭代周期≤7天，提测前完成自测+代码评审，标注改动影响范围。