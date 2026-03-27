import React from 'react';
import { Button, Card, Space } from 'antd';
import ErrorBoundary from '../components/ErrorBoundary';

// 测试用的会抛出错误的组件
const BrokenComponent = () => {
  throw new Error('这是一个测试错误！');
};

// 测试用的会抛出错误的类组件
class BrokenClassComponent extends React.Component {
  render() {
    throw new Error('这是一个类组件的测试错误！');
  }
}

// 测试用的正常组件
const NormalComponent = () => (
  <Card style={{ marginBottom: '16px' }}>
    <h3>✅ 正常组件</h3>
    <p>这个组件正常渲染，没有错误</p>
  </Card>
);

function ErrorBoundaryTest() {
  const [showError, setShowError] = React.useState(false);

  const handleError = (error, errorInfo) => {
    console.error('错误边界捕获到错误:', error, errorInfo);
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <Card
        style={{
          marginBottom: '24px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: '#fff',
        }}
      >
        <h1 style={{ fontSize: '24px', marginBottom: '8px' }}>🧪 错误边界测试页面</h1>
        <p style={{ opacity: 0.9 }}>
          用于测试 React 错误边界（Error Boundary）功能，确保单个组件错误不会导致整个页面崩溃
        </p>
      </Card>

      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <Card title="测试 1：根级别错误边界" size="small">
          <p>这个测试会触发整个应用级别的错误边界（在 main.jsx 中定义）</p>
          <Button
            type="primary"
            danger
            onClick={() => {
              throw new Error('根级别测试错误！');
            }}
          >
            触发根级别错误
          </Button>
        </Card>

        <Card title="测试 2：页面级别错误边界" size="small">
          <p>这个测试会触发页面级别的错误边界</p>
          <Button type="primary" danger onClick={() => setShowError(true)}>
            触发页面错误
          </Button>
          {showError && <BrokenComponent />}
        </Card>

        <Card title="测试 3：组件级别错误边界（带自定义错误处理）" size="small">
          <ErrorBoundary
            fullPage={false}
            title="组件渲染失败"
            subTitle="这个组件在渲染时遇到了错误"
            onError={handleError}
          >
            <BrokenComponent />
          </ErrorBoundary>
        </Card>

        <Card title="测试 4：组件级别错误边界（带自定义 fallback）" size="small">
          <ErrorBoundary
            fallback={
              <div
                style={{
                  padding: '20px',
                  background: '#fff2f0',
                  border: '1px solid #ffccc7',
                  borderRadius: '8px',
                  textAlign: 'center',
                }}
              >
                <h3 style={{ color: '#ff4d4f', margin: '0 0 8px 0' }}>⚠️ 自定义错误提示</h3>
                <p style={{ margin: 0, color: '#666' }}>
                  这是自定义的 fallback UI，当组件出错时会显示这个界面
                </p>
              </div>
            }
          >
            <BrokenClassComponent />
          </ErrorBoundary>
        </Card>

        <Card title="测试 5：混合正常和错误组件" size="small">
          <p>验证错误边界只影响出错的组件，不影响其他组件</p>
          <NormalComponent />
          <ErrorBoundary>
            <BrokenComponent />
          </ErrorBoundary>
          <NormalComponent />
        </Card>

        <Card title="测试 6：3D 可视化错误边界" size="small">
          <p>模拟 3D 场景加载失败的情况</p>
          <ErrorBoundary
            fullPage={false}
            title="3D 场景加载失败"
            subTitle="3D 场景在加载过程中遇到错误，可能是浏览器不支持 WebGL 或模型文件加载失败"
          >
            <BrokenComponent />
          </ErrorBoundary>
        </Card>

        <Card title="使用说明" size="small">
          <ul style={{ lineHeight: '2' }}>
            <li>
              <strong>错误边界（Error Boundary）</strong>： 是 React
              提供的错误处理机制，可以捕获子组件树中的 JavaScript 错误
            </li>
            <li>
              <strong>作用</strong>： 防止单个组件的错误导致整个应用崩溃，提供友好的错误提示界面
            </li>
            <li>
              <strong>实现方式</strong>： 使用 React.Component 的 componentDidCatch 和
              getDerivedStateFromError 生命周期方法
            </li>
            <li>
              <strong>注意事项</strong>：
              错误边界无法捕获事件处理器、异步代码、服务端渲染、自身抛出的错误
            </li>
          </ul>
        </Card>
      </Space>
    </div>
  );
}

export default ErrorBoundaryTest;
