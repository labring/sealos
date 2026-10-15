const { createHmac } = require('node:crypto');

/**
 * 只使用实名服务已验证的主体编号；不能用账号、姓名、电话兜底。
 * @param {string} pepper 永久保存于全局库的随机密钥
 * @param {{ isVerified?: boolean, idCard?: string | null } | null} personal
 * @param {{ isVerified?: boolean, additionalInfo?: unknown } | null} enterprise
 * @returns {string[]}
 */
function rewardIdentityKeys(pepper, personal, enterprise) {
  const keys = [];
  if (!/^[a-f0-9]{64}$/.test(pepper)) throw new Error('Activity identity key is unavailable');
  const id = personal?.isVerified ? personal.idCard?.trim().toUpperCase() : null;
  // 身份证由实名服务校验真伪；这里检查形状，防止空值误共用资格。
  if (id && /^\d{17}[\dX]$/.test(id)) keys.push(fingerprint(pepper, 'personal', id));
  const info = enterprise?.isVerified ? enterprise.additionalInfo : null;
  const key = info && typeof info === 'object' && 'key' in info ? info.key : null;
  const normalized = typeof key === 'string' ? key.trim().toUpperCase() : '';
  // 企业接口的 key 是已验证的企业主体编号；不要求特定证照类型，但禁止空白/控制字符。
  if (normalized && /^[A-Z0-9-]{8,64}$/.test(normalized)) {
    keys.push(fingerprint(pepper, 'enterprise', normalized));
  }
  return keys;
}

/** @param {string} pepper @param {string} kind @param {string} value */
function fingerprint(pepper, kind, value) {
  return `v1:${createHmac('sha256', Buffer.from(pepper, 'hex'))
    .update(`${kind}:${value}`)
    .digest('hex')}`;
}

/** @type {(pepper: string, personal: Parameters<typeof rewardIdentityKeys>[1], enterprise: Parameters<typeof rewardIdentityKeys>[2]) => string | null} */
const rewardIdentityKey = (pepper, personal, enterprise) =>
  rewardIdentityKeys(pepper, personal, enterprise)[0] ?? null;

module.exports = { rewardIdentityKey, rewardIdentityKeys };
