import dayjs from 'dayjs';
import { customAlphabet } from 'nanoid';

export const formatTime = (time: string | number | Date, format = 'YYYY-MM-DD HH:mm:ss') => {
  return dayjs(time).format(format);
};

export const generateRandomPassword = () => {
  const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz', 4);
  const nanoidUpper = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ', 4);
  const nanoidNumber = customAlphabet('0123456789', 4);
  const password = nanoid() + nanoidUpper() + nanoidNumber();
  return password;
};
