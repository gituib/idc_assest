/**
 * 前端密码加密工具
 * 注意：这只是增加一层保护，真正的安全需要 HTTPS
 */

/**
 * 使用 SHA-256 对密码进行哈希
 * @param {string} password - 明文密码
 * @returns {Promise<string>} - 返回十六进制哈希值
 */
export async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * 为登录请求准备密码（双重哈希：SHA-256 + 服务器 bcrypt）
 * @param {string} password - 明文密码
 * @returns {Promise<string>} - 哈希后的密码
 */
export async function preparePassword(password) {
  if (!password) return password;
  return await hashPassword(password);
}
