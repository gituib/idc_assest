import { useState, useEffect, useCallback } from 'react';

export const BREAKPOINTS = {
  xs: 0,
  sm: 768,
  md: 992,
  lg: 1200,
  xl: 1440,
};

export const SCREEN_SIZES = {
  xs: 'xs',
  sm: 'sm',
  md: 'md',
  lg: 'lg',
  xl: 'xl',
};

const getScreenSize = (width) => {
  if (width >= BREAKPOINTS.xl) return SCREEN_SIZES.xl;
  if (width >= BREAKPOINTS.lg) return SCREEN_SIZES.lg;
  if (width >= BREAKPOINTS.md) return SCREEN_SIZES.md;
  if (width >= BREAKPOINTS.sm) return SCREEN_SIZES.sm;
  return SCREEN_SIZES.xs;
};

const getScreenSizeConfig = (screenSize) => {
  const configs = {
    xs: {
      showFullButtonLabels: false,
      buttonIconOnly: true,
      showDeviceSlide: false,
      panelFullWidth: true,
      collapseActions: true,
    },
    sm: {
      showFullButtonLabels: false,
      buttonIconOnly: true,
      showDeviceSlide: false,
      panelFullWidth: true,
      collapseActions: true,
    },
    md: {
      showFullButtonLabels: false,
      buttonIconOnly: true,
      showDeviceSlide: true,
      panelFullWidth: false,
      collapseActions: true,
    },
    lg: {
      showFullButtonLabels: true,
      buttonIconOnly: false,
      showDeviceSlide: true,
      panelFullWidth: false,
      collapseActions: false,
    },
    xl: {
      showFullButtonLabels: true,
      buttonIconOnly: false,
      showDeviceSlide: true,
      panelFullWidth: false,
      collapseActions: false,
    },
  };
  return configs[screenSize] || configs.lg;
};

export const useResponsiveLayout = () => {
  const [screenSize, setScreenSize] = useState(() => getScreenSize(window.innerWidth));
  const [config, setConfig] = useState(() => getScreenSizeConfig(screenSize));

  const handleResize = useCallback(() => {
    const width = window.innerWidth;
    const newScreenSize = getScreenSize(width);
    if (newScreenSize !== screenSize) {
      setScreenSize(newScreenSize);
      setConfig(getScreenSizeConfig(newScreenSize));
    }
  }, [screenSize]);

  useEffect(() => {
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  const isMobile = screenSize === SCREEN_SIZES.xs || screenSize === SCREEN_SIZES.sm;
  const isTablet = screenSize === SCREEN_SIZES.md;
  const isDesktop = screenSize === SCREEN_SIZES.lg || screenSize === SCREEN_SIZES.xl;

  return {
    screenSize,
    config,
    breakpoints: BREAKPOINTS,
    isMobile,
    isTablet,
    isDesktop,
    width: window.innerWidth,
    height: window.innerHeight,
  };
};

export default useResponsiveLayout;