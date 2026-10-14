import crypto from 'crypto';
import {
  GIFT_CODE_ALPHABET,
  GIFT_CODE_LENGTH,
  INVITE_CODE_ALPHABET,
  INVITE_CODE_LENGTH
} from './constants';

// 用 crypto 随机在去混淆字母表上取串，避免可预测序列
const randomCodeFromAlphabet = (alphabet: string, length: number) => {
  const bytes = crypto.randomBytes(length);
  let code = '';
  for (let i = 0; i < length; i++) {
    // 拒绝采样不需要：直接按字节取模，字母表长度 31 时偏差可忽略（邀请码/活动码非安全凭据）
    code += alphabet[bytes[i] % alphabet.length];
  }
  return code;
};

export const generateInviteCode = () =>
  randomCodeFromAlphabet(INVITE_CODE_ALPHABET, INVITE_CODE_LENGTH);

export const generateActivityGiftCode = () =>
  randomCodeFromAlphabet(GIFT_CODE_ALPHABET, GIFT_CODE_LENGTH);

// 昵称脱敏：首字符 + ***，空昵称给固定文案，避免暴露可识别信息
export const maskNickname = (nickname?: string | null) => {
  const trimmed = nickname?.trim();
  if (!trimmed) return 'Sealos 用户';
  return `${trimmed[0]}***`;
};
