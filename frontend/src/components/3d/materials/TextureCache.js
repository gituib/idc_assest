import * as THREE from 'three';

class TextureCache {
  constructor() {
    this.cache = new Map();
  }

  getOrCreate(key, creator) {
    if (!this.cache.has(key)) {
      this.cache.set(key, creator());
    }
    return this.cache.get(key);
  }

  dispose() {
    this.cache.forEach(texture => {
      if (texture instanceof THREE.CanvasTexture) {
        texture.dispose();
      }
    });
    this.cache.clear();
  }
}

const uLabelTextureCache = new TextureCache();

export const getULabelTexture = num => {
  return uLabelTextureCache.getOrCreate(num, () => {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, 32, 32);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(num.toString(), 16, 16);

    return new THREE.CanvasTexture(canvas);
  });
};

export const disposeULabelTextures = () => {
  uLabelTextureCache.dispose();
};

export default TextureCache;
