import * as THREE from 'three';
import { MATERIAL_CONFIGS, MATERIAL_TYPES } from './constants.js';

export const createRackFrameMaterial = (options = {}) => {
  const config = MATERIAL_CONFIGS[MATERIAL_TYPES.RACK_FRAME];
  return (
    <meshStandardMaterial
      color={config.color}
      metalness={config.metalness}
      roughness={config.roughness}
      envMapIntensity={config.envMapIntensity}
      {...options}
    />
  );
};

export const createRailMaterial = (options = {}) => {
  const config = MATERIAL_CONFIGS[MATERIAL_TYPES.RAIL];
  return (
    <meshStandardMaterial
      color={config.color}
      metalness={config.metalness}
      roughness={config.roughness}
      envMapIntensity={config.envMapIntensity}
      {...options}
    />
  );
};

export const createRailHoleMaterial = (options = {}) => {
  const config = MATERIAL_CONFIGS[MATERIAL_TYPES.RAIL_HOLE];
  return (
    <meshBasicMaterial
      color={config.color}
      metalness={config.metalness}
      roughness={config.roughness}
      {...options}
    />
  );
};

export const createSidePanelMaterial = (options = {}) => {
  const config = MATERIAL_CONFIGS[MATERIAL_TYPES.SIDE_PANEL];
  return (
    <meshStandardMaterial
      color={config.color}
      metalness={config.metalness}
      roughness={config.roughness}
      envMapIntensity={config.envMapIntensity}
      {...options}
    />
  );
};

export const createTopPlateMaterial = (options = {}) => {
  const config = MATERIAL_CONFIGS[MATERIAL_TYPES.TOP_PLATE];
  return (
    <meshStandardMaterial
      color={config.color}
      metalness={config.metalness}
      roughness={config.roughness}
      envMapIntensity={config.envMapIntensity}
      {...options}
    />
  );
};

export const createBottomPlateMaterial = (options = {}) => {
  const config = MATERIAL_CONFIGS[MATERIAL_TYPES.BOTTOM_PLATE];
  return (
    <meshStandardMaterial
      color={config.color}
      metalness={config.metalness}
      roughness={config.roughness}
      envMapIntensity={config.envMapIntensity}
      {...options}
    />
  );
};

export const createTextLabelMaterial = (color = '#ffffff') => {
  return <meshBasicMaterial color={color} side={THREE.DoubleSide} />;
};

export const createUMarkMaterial = () => {
  return <meshBasicMaterial color="#ffffff" side={THREE.DoubleSide} />;
};

export const createOutlineMaterial = (color = '#3b82f6', opacity = 0.8) => {
  return <lineBasicMaterial color={color} transparent opacity={opacity} />;
};

export const createSelectionMaterial = (color = '#3b82f6', opacity = 0.3) => {
  return <meshBasicMaterial color={color} transparent opacity={opacity} side={THREE.DoubleSide} />;
};
