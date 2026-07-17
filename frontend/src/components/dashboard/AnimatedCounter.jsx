import React, { useState, useEffect, useRef } from 'react';

/**
 * 数字递增动画组件
 * @param {Object} props - 组件属性
 * @param {number} props.value - 目标数值
 * @param {number} [props.duration=1500] - 动画持续时间（毫秒）
 * @returns {React.ReactElement} 渲染的动画数字
 */
const AnimatedCounter = ({ value, duration = 1500 }) => {
  const [displayValue, setDisplayValue] = useState(0);
  const animationRef = useRef(null);
  const startTimeRef = useRef(null);

  // 处理 value 为 NaN/undefined/null 的边界情况，统一降级为 0
  const targetValue = typeof value === 'number' && !isNaN(value) ? value : 0;

  useEffect(() => {
    // 每次目标值变化时重置开始时间，确保动画从新值重新开始
    startTimeRef.current = null;

    const animate = currentTime => {
      if (!startTimeRef.current) {
        startTimeRef.current = currentTime;
      }

      const elapsed = currentTime - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const currentValue = Math.floor(easeOutQuart * targetValue);

      setDisplayValue(currentValue);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [targetValue, duration]);

  return <span>{displayValue}</span>;
};

export default React.memo(AnimatedCounter);
