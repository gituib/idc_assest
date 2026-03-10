import React from 'react';
import { Card, Col, Tag, Spin } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import { designTokens } from '../../config/theme';
import AnimatedCounter from './AnimatedCounter';

const createStatCardStyle = (color) => ({
  borderRadius: designTokens.borderRadius.large,
  border: 'none',
  boxShadow: designTokens.shadows.medium,
  background: '#fff',
  transition: `all ${designTokens.transitions.normal}`,
  overflow: 'hidden',
  cursor: 'pointer',
  height: '100%',
  animation: 'fadeInUp 0.6s ease-out backwards',
  borderLeft: `4px solid ${color}`,
});

const createStatIconContainer = (color) => ({
  width: 'clamp(40px, 8vw, 64px)',
  height: 'clamp(40px, 8vw, 64px)',
  borderRadius: designTokens.borderRadius.medium,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 'clamp(20px, 4vw, 32px)',
  transition: `all ${designTokens.transitions.normal}`,
  flexShrink: 0,
  background: `linear-gradient(135deg, ${color}20 0%, ${color}10 100%)`,
});

const StatCard = ({
  config,
  stats,
  loading,
  animatedKey,
  hoveredCard,
  onHover,
}) => {
  const {
    icon: Icon,
    color,
    statKey,
    title,
    trend,
    tagColor,
    customStatus,
    xs,
    sm,
    lg,
    xl,
    delay,
  } = config;

  const colProps = { xs, sm, lg, xl };
  const cardStyle = {
    ...createStatCardStyle(color),
    ...(hoveredCard === statKey
      ? { transform: 'translateY(-6px)', boxShadow: designTokens.shadows.xl }
      : {}),
    animationDelay: `${delay * 0.1}s`,
  };

  return (
    <Col key={statKey} {...colProps}>
      <Card
        style={cardStyle}
        onMouseEnter={() => onHover(statKey)}
        onMouseLeave={() => onHover(null)}
        styles={{ body: { padding: 'clamp(16px, 3vw, 24px)' } }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
            }}
          >
            <span
              style={{
                fontSize: 'clamp(0.75rem, 2vw, 0.9rem)',
                fontWeight: '600',
                color: designTokens.colors.text.secondary,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                flex: 1,
              }}
            >
              {title}
            </span>
            <div style={createStatIconContainer(color)}>
              <Icon style={{ color }} />
            </div>
          </div>
          <div
            className="stat-value"
            style={{
              fontSize: 'clamp(1.6rem, 4vw, 2.2rem)',
              fontWeight: '700',
              color: color,
              lineHeight: 1,
              whiteSpace: 'nowrap',
            }}
          >
            {loading ? (
              <Spin size="small" />
            ) : (
              <AnimatedCounter key={`${animatedKey}-${statKey}`} value={stats[statKey]} />
            )}
          </div>
          {customStatus ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                fontSize: 'clamp(0.7rem, 1.8vw, 0.85rem)',
                color: designTokens.colors.success.main,
                whiteSpace: 'nowrap',
              }}
            >
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  background: designTokens.colors.success.main,
                  borderRadius: '50%',
                  marginRight: '6px',
                  boxShadow: '0 0 6px rgba(82, 196, 26, 0.5)',
                  flexShrink: 0,
                }}
              />
              <span>{statKey === 'totalRacks' ? '正常运行中' : '全部在线'}</span>
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                fontSize: 'clamp(0.7rem, 1.8vw, 0.875rem)',
                fontWeight: '500',
                color: trend > 0 ? designTokens.colors.success.main : designTokens.colors.error.main,
                flexWrap: 'wrap',
                gap: '4px',
              }}
            >
              {trend > 0 ? (
                <ArrowUpOutlined style={{ fontSize: '0.75rem' }} />
              ) : (
                <ArrowDownOutlined style={{ fontSize: '0.75rem' }} />
              )}
              <span>{Math.abs(trend)}%</span>
              <Tag
                color={tagColor}
                style={{
                  fontSize: 'clamp(0.6rem, 1.5vw, 0.75rem)',
                  borderRadius: '4px',
                  margin: 0,
                  padding: '0 4px',
                  lineHeight: '1.4',
                }}
              >
                环比
              </Tag>
            </div>
          )}
        </div>
      </Card>
    </Col>
  );
};

export default React.memo(StatCard);
