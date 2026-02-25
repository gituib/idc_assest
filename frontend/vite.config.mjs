import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Components from 'unplugin-vue-components/vite';
import { AntDesignVueResolver } from 'unplugin-vue-components/resolvers';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 从配置文件或环境变量获取端口
const getFrontendPort = () => {
  // 优先级：环境变量 > 配置文件 > 默认值
  if (process.env.FRONTEND_PORT) {
    return parseInt(process.env.FRONTEND_PORT, 10);
  }

  // 尝试读取配置文件
  const configPath = path.resolve(__dirname, '.frontend-port');
  if (fs.existsSync(configPath)) {
    try {
      const port = parseInt(fs.readFileSync(configPath, 'utf-8').trim(), 10);
      if (!isNaN(port) && port > 0 && port < 65536) {
        return port;
      }
    } catch (e) {
      console.warn('读取前端端口配置文件失败，使用默认端口 3000');
    }
  }

  return 3000;
};

const port = getFrontendPort();

export default defineConfig({
  plugins: [
    react(),
    Components({
      resolvers: [
        AntDesignVueResolver({
          importStyle: false,
        }),
      ],
      dts: false,
    }),
  ],
  assetsInclude: ['**/*.hdr', '**/*.woff2'],
  server: {
    host: '0.0.0.0',
    port: port,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true
      },
      '/uploads': {
        target: 'http://localhost:8000',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom', 'react-router-dom'],
          'charts': ['axios', 'dayjs'],
          'three': ['three', '@react-three/fiber', '@react-three/drei']
        },
        chunkFileNames: 'js/[name]-[hash].js',
        entryFileNames: 'js/[name]-[hash].js',
        assetFileNames: '[ext]/[name]-[hash].[ext]',
        compact: true
      }
    },
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    }
  },
  optimizeDeps: {
    include: ['axios', 'react-router-dom']
  }
});
