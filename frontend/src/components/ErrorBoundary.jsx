import React, { Component } from 'react';
import { Button, Result, Space, Collapse, Typography } from 'antd';
import { WarningOutlined, ReloadOutlined, HomeOutlined, BugOutlined } from '@ant-design/icons';

const { Text, Paragraph } = Typography;
const { Panel } = Collapse;

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    console.error('错误边界捕获到错误:', error, errorInfo);

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: this.props.fullPage ? '100vh' : '400px',
            background: this.props.fullPage ? '#f5f5f5' : 'transparent',
            padding: '24px',
          }}
        >
          <Result
            status="error"
            title={this.props.title || '组件加载失败'}
            subTitle={
              this.props.subTitle ||
              '抱歉，该组件在加载过程中遇到了错误。您可以尝试重新加载或返回首页。'
            }
            icon={
              <WarningOutlined
                style={{
                  fontSize: '64px',
                  color: '#ff4d4f',
                }}
              />
            }
            extra={
              <Space size="middle">
                <Button type="primary" icon={<ReloadOutlined />} onClick={this.handleReload}>
                  重新加载
                </Button>
                <Button icon={<HomeOutlined />} onClick={this.handleGoHome}>
                  返回首页
                </Button>
              </Space>
            }
          >
            {this.state.error && (
              <div style={{ textAlign: 'left', marginTop: '24px' }}>
                <Collapse
                  size="small"
                  items={[
                    {
                      key: 'error-details',
                      label: (
                        <Space>
                          <BugOutlined />
                          <Text type="secondary">查看错误详情（开发环境）</Text>
                        </Space>
                      ),
                      children: (
                        <>
                          <Paragraph
                            code
                            style={{
                              background: '#f5f5f5',
                              padding: '12px',
                              borderRadius: '4px',
                              marginBottom: '8px',
                            }}
                          >
                            {this.state.error.toString()}
                          </Paragraph>
                          {this.state.errorInfo?.componentStack && (
                            <Paragraph
                              code
                              style={{
                                background: '#f5f5f5',
                                padding: '12px',
                                borderRadius: '4px',
                                fontSize: '12px',
                                overflow: 'auto',
                                maxHeight: '200px',
                              }}
                            >
                              {this.state.errorInfo.componentStack}
                            </Paragraph>
                          )}
                        </>
                      ),
                    },
                  ]}
                />
              </div>
            )}
          </Result>
        </div>
      );
    }

    return this.props.children;
  }
}

ErrorBoundary.defaultProps = {
  fallback: null,
  fullPage: false,
  title: null,
  subTitle: null,
  onError: null,
};

export default ErrorBoundary;
