const swaggerJsdoc = require('swagger-jsdoc');

const customCSS = `
/* ========================================
   IDC设备管理系统 - Swagger UI 翠竹绿风格定制
   ======================================== */

/* 隐藏默认顶部栏 */
.swagger-ui .topbar {
  display: none;
}

/* 全局字体设置 */
.swagger-ui {
  font-family: 'Inter', 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

/* 主容器背景 - 淡绿灰渐变 */
.swagger-ui .swagger-container {
  background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 50%, #e2e8e0 100%);
}

/* 标题区域 */
.swagger-ui .title {
  font-size: 24px !important;
  font-weight: 700 !important;
  color: #166534 !important;
  text-shadow: 0 2px 8px rgba(22, 101, 52, 0.1);
}

/* 描述文字 */
.swagger-ui .title small {
  background: linear-gradient(135deg, #22c55e, #16a34a) !important;
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 12px !important;
  color: #fff !important;
}

/* 信息容器 */
.swagger-ui .info {
  margin: 30px 0 !important;
  padding: 24px !important;
  background: rgba(255, 255, 255, 0.9) !important;
  border-radius: 16px !important;
  border: 1px solid rgba(34, 197, 94, 0.2) !important;
  box-shadow: 0 4px 24px rgba(22, 101, 52, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04) !important;
}

.swagger-ui .info .title {
  color: #166534 !important;
  font-size: 28px !important;
}

.swagger-ui .info p {
  color: #64748b !important;
  line-height: 1.7 !important;
}

/* 服务器选择器 */
.swagger-ui .servers {
  margin: 20px 0 !important;
}

.swagger-ui .servers > label {
  color: #64748b !important;
  font-size: 12px !important;
  font-weight: 600 !important;
  text-transform: uppercase !important;
  letter-spacing: 1px !important;
}

.swagger-ui .servers select {
  background: rgba(255, 255, 255, 0.95) !important;
  border: 1px solid rgba(34, 197, 94, 0.3) !important;
  border-radius: 8px !important;
  color: #166534 !important;
  padding: 10px 16px !important;
  font-size: 14px !important;
  cursor: pointer;
  transition: all 0.3s ease !important;
}

.swagger-ui .servers select:hover {
  border-color: rgba(34, 197, 94, 0.6) !important;
  box-shadow: 0 0 12px rgba(34, 197, 94, 0.15) !important;
}

/* 标签页导航 */
.swagger-ui .opblock-tag {
  background: rgba(255, 255, 255, 0.8) !important;
  border: none !important;
  border-bottom: 2px solid transparent !important;
  margin: 0 !important;
  padding: 16px 20px !important;
  transition: all 0.3s ease !important;
}

.swagger-ui .opblock-tag:hover {
  background: rgba(34, 197, 94, 0.08) !important;
}

.swagger-ui .opblock-tag .tag-header {
  color: #1e293b !important;
  font-size: 15px !important;
  font-weight: 600 !important;
}

.swagger-ui .opblock-tag .tag-header span {
  color: #94a3b8 !important;
  font-size: 13px !important;
  font-weight: 400 !important;
}

/* 展开的API块 */
.swagger-ui .opblock {
  background: rgba(255, 255, 255, 0.85) !important;
  border: 1px solid rgba(0, 0, 0, 0.06) !important;
  border-radius: 12px !important;
  margin: 8px 0 !important;
  box-shadow: 0 2px 8px rgba(22, 101, 52, 0.04) !important;
  transition: all 0.3s ease !important;
}

.swagger-ui .opblock:hover {
  border-color: rgba(34, 197, 94, 0.3) !important;
  box-shadow: 0 4px 16px rgba(34, 197, 94, 0.1) !important;
  transform: translateY(-1px) !important;
}

.swagger-ui .opblock.opblock-post {
  border-left: 4px solid #22c55e !important;
}

.swagger-ui .opblock.opblock-get {
  border-left: 4px solid #3b82f6 !important;
}

.swagger-ui .opblock.opblock-put {
  border-left: 4px solid #f59e0b !important;
}

.swagger-ui .opblock.opblock-delete {
  border-left: 4px solid #ef4444 !important;
}

.swagger-ui .opblock.opblock-patch {
  border-left: 4px solid #8b5cf6 !important;
}

/* 操作标题栏 */
.swagger-ui .opblock .opblock-summary {
  padding: 12px 16px !important;
}

.swagger-ui .opblock .opblock-summary .opblock-summary-path {
  color: #1e293b !important;
  font-size: 14px !important;
  font-weight: 500 !important;
  font-family: 'SF Mono', 'Consolas', monospace !important;
}

.swagger-ui .opblock .opblock-summary .opblock-summary-path:hover {
  color: #166534 !important;
}

/* HTTP方法标签 */
.swagger-ui .opblock .opblock-summary .opblock-summary-method {
  border-radius: 6px !important;
  font-size: 12px !important;
  font-weight: 700 !important;
  min-width: 60px !important;
  padding: 6px 10px !important;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1) !important;
}

.swagger-ui .opblock .opblock-summary .opblock-summary-method span {
  font-size: 12px !important;
}

/* GET 方法 - 静谧蓝 */
.swagger-ui .opblock-get .opblock-summary-method {
  background: linear-gradient(135deg, #60a5fa, #3b82f6) !important;
  border: none !important;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3) !important;
}

/* POST 方法 - 翠竹绿 */
.swagger-ui .opblock-post .opblock-summary-method {
  background: linear-gradient(135deg, #4ade80, #22c55e) !important;
  border: none !important;
  box-shadow: 0 2px 8px rgba(34, 197, 94, 0.3) !important;
}

/* PUT 方法 - 暖阳橙 */
.swagger-ui .opblock-put .opblock-summary-method {
  background: linear-gradient(135deg, #fbbf24, #f59e0b) !important;
  border: none !important;
  box-shadow: 0 2px 8px rgba(245, 158, 11, 0.3) !important;
}

/* DELETE 方法 - 胭脂红 */
.swagger-ui .opblock-delete .opblock-summary-method {
  background: linear-gradient(135deg, #f87171, #ef4444) !important;
  border: none !important;
  box-shadow: 0 2px 8px rgba(239, 68, 68, 0.3) !important;
}

/* PATCH 方法 - 梦幻紫 */
.swagger-ui .opblock-patch .opblock-summary-method {
  background: linear-gradient(135deg, #a78bfa, #8b5cf6) !important;
  border: none !important;
  box-shadow: 0 2px 8px rgba(139, 92, 246, 0.3) !important;
}

/* 参数区域 */
.swagger-ui .opblock .opblock-section-header {
  background: rgba(248, 250, 252, 0.8) !important;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06) !important;
  padding: 12px 16px !important;
}

.swagger-ui .opblock .opblock-section-header h4 {
  color: #64748b !important;
  font-size: 12px !important;
  font-weight: 600 !important;
  text-transform: uppercase !important;
  letter-spacing: 1px !important;
}

/* 参数框 */
.swagger-ui .parameters .parameter {
  padding: 12px 0 !important;
}

.swagger-ui .parameters .parameter .parameter__name {
  color: #1e293b !important;
  font-weight: 500 !important;
}

.swagger-ui .parameters .parameter .parameter__name.required:after {
  color: #ef4444 !important;
  content: " *";
}

.swagger-ui .parameters .parameter input,
.swagger-ui .parameters .parameter textarea {
  background: rgba(255, 255, 255, 0.95) !important;
  border: 1px solid rgba(0, 0, 0, 0.1) !important;
  border-radius: 8px !important;
  color: #1e293b !important;
  padding: 10px 14px !important;
  font-size: 14px !important;
  transition: all 0.3s ease !important;
}

.swagger-ui .parameters .parameter input:focus,
.swagger-ui .parameters .parameter textarea:focus {
  border-color: #22c55e !important;
  box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.1) !important;
  outline: none !important;
}

/* 请求体编辑器 */
.swagger-ui .body-edit-area {
  background: rgba(255, 255, 255, 0.95) !important;
  border: 1px solid rgba(0, 0, 0, 0.1) !important;
  border-radius: 8px !important;
  color: #1e293b !important;
  font-family: 'SF Mono', 'Consolas', monospace !important;
}

.swagger-ui .body-edit-area:focus {
  border-color: #22c55e !important;
  box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.1) !important;
}

/* 执行按钮 - 翠竹绿 */
.swagger-ui .btn {
  border-radius: 8px !important;
  font-weight: 600 !important;
  font-size: 14px !important;
  padding: 10px 20px !important;
  transition: all 0.3s ease !important;
  text-transform: uppercase !important;
  letter-spacing: 0.5px !important;
}

.swagger-ui .btn.execute {
  background: linear-gradient(135deg, #4ade80, #22c55e) !important;
  border: none !important;
  color: #fff !important;
  box-shadow: 0 4px 16px rgba(34, 197, 94, 0.3) !important;
}

.swagger-ui .btn.execute:hover {
  background: linear-gradient(135deg, #22c55e, #16a34a) !important;
  box-shadow: 0 6px 24px rgba(34, 197, 94, 0.4) !important;
  transform: translateY(-1px) !important;
}

/* 响应区域 */
.swagger-ui .responses-wrapper {
  background: rgba(248, 250, 252, 0.6) !important;
  border-top: 1px solid rgba(0, 0, 0, 0.06) !important;
}

.swagger-ui .response-col_status {
  color: #64748b !important;
  font-weight: 600 !important;
}

.swagger-ui .response-col_status.success {
  color: #22c55e !important;
}

.swagger-ui .response-col_status.error {
  color: #ef4444 !important;
}

/* 认证区域 */
.swagger-ui .auth-wrapper {
  background: rgba(255, 255, 255, 0.9) !important;
  border: 1px solid rgba(34, 197, 94, 0.2) !important;
  border-radius: 12px !important;
  padding: 16px !important;
}

.swagger-ui .auth-wrapper .authorize {
  background: rgba(34, 197, 94, 0.1) !important;
  border: 1px solid rgba(34, 197, 94, 0.3) !important;
  border-radius: 8px !important;
  color: #166534 !important;
  padding: 8px 16px !important;
  font-weight: 600 !important;
  transition: all 0.3s ease !important;
}

.swagger-ui .auth-wrapper .authorize:hover {
  background: rgba(34, 197, 94, 0.2) !important;
  box-shadow: 0 0 12px rgba(34, 197, 94, 0.15) !important;
}

/* 滚动条美化 */
.swagger-ui ::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.swagger-ui ::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.04) !important;
}

.swagger-ui ::-webkit-scrollbar-thumb {
  background: rgba(34, 197, 94, 0.3) !important;
  border-radius: 4px !important;
}

.swagger-ui ::-webkit-scrollbar-thumb:hover {
  background: rgba(34, 197, 94, 0.5) !important;
}

/* 模型区域 */
.swagger-ui .model-container {
  background: rgba(255, 255, 255, 0.8) !important;
  border: 1px solid rgba(0, 0, 0, 0.06) !important;
  border-radius: 8px !important;
  padding: 16px !important;
}

.swagger-ui .model {
  color: #1e293b !important;
}

.swagger-ui .model .model-title {
  color: #166534 !important;
  font-weight: 600 !important;
}

.swagger-ui .model .prop {
  color: #64748b !important;
}

.swagger-ui .model .prop-type {
  color: #f59e0b !important;
}

.swagger-ui .model .prop-primitive {
  color: #22c55e !important;
}

/* Markdown 内容 */
.swagger-ui .markdown p,
.swagger-ui .markdown li {
  color: #64748b !important;
  line-height: 1.7 !important;
}

.swagger-ui .markdown code {
  background: rgba(34, 197, 94, 0.1) !important;
  border-radius: 4px !important;
  color: #166534 !important;
  padding: 2px 6px !important;
  font-size: 13px !important;
}

/* Loading 状态 */
.swagger-ui .loading-container .loading {
  background: rgba(255, 255, 255, 0.95) !important;
}

.swagger-ui .loading-container .loading::after {
  border-color: #22c55e transparent transparent transparent !important;
}

/* 展开/折叠箭头 */
.swagger-ui .expand-operations {
  background: rgba(255, 255, 255, 0.8) !important;
  border-radius: 8px !important;
}

.swagger-ui .expand-operations button {
  color: #64748b !important;
}

.swagger-ui .expand-operations button:hover {
  color: #166534 !important;
}

/* 过滤器 */
.swagger-ui .filter-container .filter-wrapper {
  background: rgba(255, 255, 255, 0.9) !important;
  border: 1px solid rgba(0, 0, 0, 0.06) !important;
  border-radius: 8px !important;
}

.swagger-ui .filter-container input {
  background: rgba(255, 255, 255, 0.95) !important;
  border: none !important;
  color: #1e293b !important;
  padding: 8px 12px !important;
  border-radius: 6px !important;
}

.swagger-ui .filter-container input::placeholder {
  color: #94a3b8 !important;
}

/* 版本信息 */
.swagger-ui .version-stamp {
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(22, 163, 74, 0.15)) !important;
  border: 1px solid rgba(34, 197, 94, 0.3) !important;
  border-radius: 6px !important;
}

.swagger-ui .version-stamp span {
  color: #166534 !important;
  font-weight: 600 !important;
}

/* 图标颜色 */
.swagger-ui .svg_assets {
  color: #64748b !important;
}

/* 角标/徽章 */
.swagger-ui .badge {
  border-radius: 4px !important;
  font-size: 11px !important;
  padding: 3px 8px !important;
}

.swagger-ui .badge--deprecated {
  background: rgba(245, 158, 11, 0.15) !important;
  color: #d97706 !important;
  border: 1px solid rgba(245, 158, 11, 0.3) !important;
}

/* Try it out 按钮 */
.swagger-ui .try-out-btn {
  background: rgba(34, 197, 94, 0.1) !important;
  border: 1px solid rgba(34, 197, 94, 0.3) !important;
  border-radius: 6px !important;
  color: #166534 !important;
  font-size: 12px !important;
  padding: 6px 12px !important;
  transition: all 0.3s ease !important;
}

.swagger-ui .try-out-btn:hover {
  background: rgba(34, 197, 94, 0.2) !important;
}

/* Copy 按钮 */
.swagger-ui .copy-to-clipboard {
  background: rgba(255, 255, 255, 0.9) !important;
  border: 1px solid rgba(0, 0, 0, 0.06) !important;
  border-radius: 6px !important;
}

.swagger-ui .copy-to-clipboard button {
  color: #64748b !important;
}

.swagger-ui .copy-to-clipboard button:hover {
  color: #166534 !important;
}
`;

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'IDC设备管理系统 API',
      version: '1.0.0',
      description: '数据中心设备管理平台后端服务 API 文档',
      contact: {
        name: 'API Support',
      },
    },
    servers: [
      {
        url: 'http://localhost:8000',
        description: '开发环境服务器',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: '输入 JWT token',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
    tags: [
      { name: 'health', description: '健康检查' },
      { name: 'auth', description: '认证接口' },
      { name: 'rooms', description: '机房管理' },
      { name: 'racks', description: '机柜管理' },
      { name: 'devices', description: '设备管理' },
      { name: 'deviceFields', description: '设备字段' },
      { name: 'device-ports', description: '设备端口' },
      { name: 'network-cards', description: '网卡管理' },
      { name: 'cables', description: '线缆管理' },
      { name: 'tickets', description: '工单管理' },
      { name: 'ticket-categories', description: '工单分类' },
      { name: 'ticket-fields', description: '工单字段' },
      { name: 'consumables', description: '耗材管理' },
      { name: 'consumable-categories', description: '耗材分类' },
      { name: 'consumable-records', description: '耗材记录' },
      { name: 'users', description: '用户管理' },
      { name: 'roles', description: '角色管理' },
      { name: 'system-settings', description: '系统设置' },
      { name: 'background', description: '背景配置' },
      { name: 'inventory', description: '盘点管理' },
      { name: 'statistics', description: '统计接口' },
      { name: 'operation-logs', description: '操作日志' },
      { name: 'backup', description: '备份管理' },
    ],
  },
  apis: ['./routes/*.js', './swagger_docs.yaml'],
};

const specs = swaggerJsdoc(options);

module.exports = { specs, customCSS };

// 如需独立使用CSS文件，可导出：
// module.exports = { specs, customCSS };
// 并在server.js中引入外部CSS文件
