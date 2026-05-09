#!/usr/bin/env node

/**
 * IDC设备管理系统 - 安装部署脚本入口
 *
 * 实际逻辑已拆分到 install/ 目录下的各个模块
 * 此文件仅作为入口，加载并执行 install/index.js
 */

require('./install/index.js');
