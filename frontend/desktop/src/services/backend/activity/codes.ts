import crypto from 'crypto';
import {
  GIFT_CODE_ALPHABET,
  GIFT_CODE_LENGTH,
  INVITE_CODE_ALPHABET,
  INVITE_CODE_LENGTH
} from './constants';

// Draw random chars from the unambiguous alphabet via crypto to avoid predictable sequences
const randomCodeFromAlphabet = (alphabet: string, length: number) => {
  const bytes = crypto.randomBytes(length);
  let code = '';
  for (let i = 0; i < length; i++) {
    // Rejection sampling unnecessary: plain byte modulo over the 31-char alphabet
    // has negligible bias (invite/gift codes are not security credentials)
    code += alphabet[bytes[i] % alphabet.length];
  }
  return code;
};

export const generateInviteCode = () =>
  randomCodeFromAlphabet(INVITE_CODE_ALPHABET, INVITE_CODE_LENGTH);

export const generateActivityGiftCode = () =>
  randomCodeFromAlphabet(GIFT_CODE_ALPHABET, GIFT_CODE_LENGTH);

// Avoid exposing identifiable information.
export const maskNickname = (nickname?: string | null) => {
  const trimmed = nickname?.trim();
  if (!trimmed) return 'Sealos 用户';
  return `${trimmed[0]}***`;
};
