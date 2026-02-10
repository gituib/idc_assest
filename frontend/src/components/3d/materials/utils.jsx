import { MATERIAL_CONFIGS, MATERIAL_TYPES } from './constants.js';

export const getMaterialConfig = type => {
  return MATERIAL_CONFIGS[type] || null;
};

export const getMaterialType = type => {
  return MATERIAL_TYPES[type] || null;
};

export const createMaterialConfig = (type, options = {}) => {
  const baseConfig = MATERIAL_CONFIGS[type];
  if (!baseConfig) {
    console.warn(`Material type "${type}" not found in configurations`);
    return null;
  }
  return { ...baseConfig, ...options };
};

export const mergeMaterialOptions = (type, options = {}) => {
  const baseConfig = MATERIAL_CONFIGS[type];
  if (!baseConfig) {
    return options;
  }
  return { ...baseConfig, ...options };
};
