# ============================================
# IDC 设备管理系统 - 后端 Dockerfile
# 基于 Node.js 20 Alpine 构建
# ============================================

FROM node:20-alpine

# 设置工作目录
WORKDIR /app

# 安装系统依赖（如需编译原生模块）
RUN apk add --no-cache tzdata

# 设置时区
ENV TZ=Asia/Shanghai

# 复制依赖配置文件
COPY package.json ./
COPY package-lock.json* yarn.lock* ./

# 安装生产依赖（不安装 devDependencies）
RUN npm install --omit=dev --ignore-scripts

# 复制后端代码
COPY . .

# 确保日志和上传目录存在
RUN mkdir -p logs uploads temp backups

# 暴露端口
EXPOSE 8000

# 启动命令
CMD ["node", "server.js"]
