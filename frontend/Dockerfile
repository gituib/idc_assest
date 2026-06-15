# ============================================
# IDC 设备管理系统 - 前端（Nginx）Dockerfile
# 第一阶段：构建前端静态文件
# 第二阶段：Nginx 运行
# ============================================

# ---------- 第一阶段：构建 ----------
FROM node:20-alpine AS build

WORKDIR /app

# 复制依赖配置
COPY package.json package-lock.json* yarn.lock* ./

# 安装所有依赖（含 devDependencies，vite build 需要）
RUN npm install --ignore-scripts

# 复制前端源码
COPY . .

# 构建生产版本
RUN npm run build

# ---------- 第二阶段：Nginx 运行 ----------
FROM nginx:alpine

# 设置时区
RUN apk add --no-cache tzdata
ENV TZ=Asia/Shanghai

# 复制 Nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 复制前端构建产物到 Nginx 静态目录
COPY --from=build /app/dist /usr/share/nginx/html

# 暴露端口
EXPOSE 80

# Nginx 前台运行
CMD ["nginx", "-g", "daemon off;"]
