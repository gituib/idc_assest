import { useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { message, Modal } from 'antd';

/**
 * 用户空闲超时检测 Hook
 * @param {Object} options - 配置选项
 * @param {number} options.timeout - 超时时间（毫秒），默认30分钟
 * @param {number} options.warningTime - 警告提示时间（毫秒），默认超时前1分钟
 * @param {Function} options.onLogout - 登出回调函数
 * @param {boolean} options.enabled - 是否启用，默认true
 */
const useIdleTimeout = ({
  timeout = 30 * 60 * 1000, // 默认30分钟
  warningTime = 60 * 1000, // 默认提前1分钟警告
  onLogout,
  enabled = true,
} = {}) => {
  const navigate = useNavigate();
  const timerRef = useRef(null);
  const warningTimerRef = useRef(null);
  const modalRef = useRef(null);
  const lastActivityRef = useRef(Date.now());

  // 清除所有定时器
  const clearTimers = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (warningTimerRef.current) {
      clearTimeout(warningTimerRef.current);
      warningTimerRef.current = null;
    }
    if (modalRef.current) {
      modalRef.current.destroy();
      modalRef.current = null;
    }
  }, []);

  // 执行登出
  const handleLogout = useCallback(() => {
    clearTimers();

    // 清除登录状态
    localStorage.removeItem('token');
    localStorage.removeItem('user');

    // 执行自定义登出回调
    if (onLogout) {
      onLogout();
    }

    message.warning('由于长时间未操作，您已自动退出登录', 3);
    navigate('/login');
  }, [clearTimers, navigate, onLogout]);

  // 显示超时警告
  const showWarning = useCallback(() => {
    let countdown = Math.ceil(warningTime / 1000);

    modalRef.current = Modal.warning({
      title: '即将超时退出',
      content: `由于长时间未操作，系统将在 ${countdown} 秒后自动退出登录，请重新登录。`,
      okText: '保持登录',
      onOk: () => {
        // 用户点击保持登录，重置计时器
        resetTimer();
      },
      maskClosable: false,
      keyboard: false,
    });

    // 更新倒计时
    const countdownInterval = setInterval(() => {
      countdown -= 1;
      if (modalRef.current && countdown > 0) {
        modalRef.current.update({
          content: `由于长时间未操作，系统将在 ${countdown} 秒后自动退出登录，请重新登录。`,
        });
      }
      if (countdown <= 0) {
        clearInterval(countdownInterval);
      }
    }, 1000);

    // 警告时间结束后自动登出
    warningTimerRef.current = setTimeout(() => {
      clearInterval(countdownInterval);
      handleLogout();
    }, warningTime);
  }, [warningTime, handleLogout]);

  // 重置计时器
  const resetTimer = useCallback(() => {
    if (!enabled) return;

    clearTimers();
    lastActivityRef.current = Date.now();

    // 设置警告定时器
    if (warningTime > 0 && timeout > warningTime) {
      warningTimerRef.current = setTimeout(() => {
        showWarning();
      }, timeout - warningTime);
    }

    // 设置超时定时器
    timerRef.current = setTimeout(() => {
      handleLogout();
    }, timeout);
  }, [enabled, timeout, warningTime, clearTimers, showWarning, handleLogout]);

  // 监听用户活动事件
  useEffect(() => {
    if (!enabled) {
      clearTimers();
      return;
    }

    // 定义需要监听的事件
    const events = [
      'mousedown',
      'mousemove',
      'keydown',
      'scroll',
      'touchstart',
      'click',
      'wheel',
    ];

    // 事件处理函数
    const handleActivity = () => {
      // 防抖：避免频繁重置
      const now = Date.now();
      if (now - lastActivityRef.current < 1000) {
        return;
      }
      resetTimer();
    };

    // 绑定事件监听
    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // 初始化计时器
    resetTimer();

    // 清理函数
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      clearTimers();
    };
  }, [enabled, resetTimer, clearTimers]);

  // 页面可见性变化处理
  useEffect(() => {
    if (!enabled) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // 页面重新可见时检查是否已超时
        const idleTime = Date.now() - lastActivityRef.current;
        if (idleTime >= timeout) {
          handleLogout();
        } else {
          resetTimer();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, timeout, resetTimer, handleLogout]);

  return {
    resetTimer,
    clearTimers,
    getIdleTime: () => Date.now() - lastActivityRef.current,
  };
};

export default useIdleTimeout;
