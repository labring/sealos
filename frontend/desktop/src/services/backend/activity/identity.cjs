const { createHmac } = require('node:crypto');

/**
 * Only use subject IDs verified by the real-name service; no account/name/phone fallback.
 * @param {string} pepper random secret stored permanently in the global database
 * @param {{ isVerified?: boolean, idCard?: string | null } | null} personal
 * @param {{ isVerified?: boolean, additionalInfo?: unknown } | null} enterprise
 * @returns {string[]}
 */
function rewardIdentityKeys(pepper, personal, enterprise) {
  const keys = [];
  if (!/^[a-f0-9]{64}$/.test(pepper)) throw new Error('Activity identity key is unavailable');
  const id = personal?.isVerified ? personal.idCard?.trim().toUpperCase() : null;
  // The real-name service verifies ID authenticity; this shape check keeps
  // empty values from wrongly sharing eligibility.
  if (id && /^\d{17}[\dX]$/.test(id)) keys.push(fingerprint(pepper, 'personal', id));
  const info = enterprise?.isVerified ? enterprise.additionalInfo : null;
  const key = info && typeof info === 'object' && 'key' in info ? info.key : null;
  const normalized = typeof key === 'string' ? key.trim().toUpperCase() : '';
  // The enterprise key is a verified enterprise subject ID; no specific license
  // type is required, but blank/control characters are rejected.
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
