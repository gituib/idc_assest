import * as THREE from 'three';
import { MATERIAL_CONFIGS, MATERIAL_TYPES } from './constants.js';

export const createDeviceChassisMaterial = (options = {}) => {
  const config = MATERIAL_CONFIGS[MATERIAL_TYPES.DEVICE_CHASSIS];
  return (
    <meshStandardMaterial
      color={config.color}
      metalness={config.metalness}
      roughness={config.roughness}
      {...options}
    />
  );
};

export const createDevicePanelMaterial = (options = {}) => {
  const config = MATERIAL_CONFIGS[MATERIAL_TYPES.DEVICE_PANEL];
  return (
    <meshStandardMaterial
      color={config.color}
      metalness={config.metalness}
      roughness={config.roughness}
      {...options}
    />
  );
};

export const createDevicePanelSelectedMaterial = (options = {}) => {
  const config = MATERIAL_CONFIGS[MATERIAL_TYPES.DEVICE_PANEL_SELECTED];
  return (
    <meshStandardMaterial
      color={config.color}
      metalness={config.metalness}
      roughness={config.roughness}
      {...options}
    />
  );
};

export const createDriveTrayMaterial = (options = {}) => {
  const config = MATERIAL_CONFIGS[MATERIAL_TYPES.DRIVE_TRAY];
  return (
    <meshStandardMaterial
      color={config.color}
      metalness={config.metalness}
      roughness={config.roughness}
      {...options}
    />
  );
};

export const createDriveTrayHandleMaterial = (options = {}) => {
  const config = MATERIAL_CONFIGS[MATERIAL_TYPES.DRIVE_TRAY_HANDLE];
  return (
    <meshStandardMaterial
      color={config.color}
      metalness={config.metalness}
      roughness={config.roughness}
      {...options}
    />
  );
};

export const createLedIndicatorMaterial = (color = '#10b981', options = {}) => {
  return <meshBasicMaterial color={color} toneMapped={false} {...options} />;
};

export const createLedErrorMaterial = (options = {}) => {
  const config = MATERIAL_CONFIGS[MATERIAL_TYPES.LED_ERROR];
  return <meshBasicMaterial color={config.color} toneMapped={false} {...options} />;
};

export const createSfpPortMaterial = (options = {}) => {
  const config = MATERIAL_CONFIGS[MATERIAL_TYPES.SFP_PORT];
  return (
    <meshPhysicalMaterial
      color={config.color}
      metalness={config.metalness}
      roughness={config.roughness}
      transparent
      opacity={config.opacity}
      {...options}
    />
  );
};

export const createRj45PortMaterial = (options = {}) => {
  const config = MATERIAL_CONFIGS[MATERIAL_TYPES.RJ45_PORT];
  return (
    <meshStandardMaterial
      color={config.color}
      metalness={config.metalness}
      roughness={config.roughness}
      {...options}
    />
  );
};

export const createVentHoleMaterial = (options = {}) => {
  const config = MATERIAL_CONFIGS[MATERIAL_TYPES.VENT_HOLE];
  return (
    <meshStandardMaterial
      color={config.color}
      metalness={config.metalness}
      roughness={config.roughness}
      {...options}
    />
  );
};

export const createBackPanelMaterial = (options = {}) => {
  const config = MATERIAL_CONFIGS[MATERIAL_TYPES.BACK_PANEL];
  return (
    <meshStandardMaterial
      color={config.color}
      metalness={config.metalness}
      roughness={config.roughness}
      transparent
      opacity={config.opacity}
      {...options}
    />
  );
};

export const createPsuModuleMaterial = (options = {}) => {
  const config = MATERIAL_CONFIGS[MATERIAL_TYPES.PSU_MODULE];
  return (
    <meshStandardMaterial
      color={config.color}
      metalness={config.metalness}
      roughness={config.roughness}
      {...options}
    />
  );
};

export const createFanModuleMaterial = (options = {}) => {
  const config = MATERIAL_CONFIGS[MATERIAL_TYPES.FAN_MODULE];
  return (
    <meshStandardMaterial
      color={config.color}
      metalness={config.metalness}
      roughness={config.roughness}
      {...options}
    />
  );
};

export const createConsolePortMaterial = (color = '#facc15') => {
  return <meshStandardMaterial color={color} metalness={0.6} roughness={0.4} />;
};

export const createUsbPortMaterial = (color = '#94a3b8') => {
  return <meshStandardMaterial color={color} metalness={0.5} roughness={0.5} />;
};

export const createResetButtonMaterial = (color = '#ef4444') => {
  return <meshStandardMaterial color={color} metalness={0.3} roughness={0.6} />;
};

export const createPcieCoverMaterial = (color = '#cbd5e1') => {
  return <meshStandardMaterial color={color} metalness={0.9} roughness={0.3} />;
};

export const createPortLedMaterial = (color = '#4ade80') => {
  return <meshBasicMaterial color={color} transparent opacity={0.8} />;
};

export const createPortLinkLedMaterial = (color = '#22c55e') => {
  return <meshBasicMaterial color={color} transparent opacity={1.0} />;
};
