import { SmsType } from '@/services/backend/db/verifyCode';

export const smsIdValid = (smsType: SmsType) => {
  if (smsType === 'phone')
    return {
      pattern: {
        value: /^1[3-9]\d{9}$/,
        message: 'Invalid Phone Number'
      },
      required: 'Phone number can not be blank'
    };
  else
    return {
      pattern: {
        value: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        message: 'Invalid Email Address'
      },
      required: 'Email Address can not be blank'
    };
};
