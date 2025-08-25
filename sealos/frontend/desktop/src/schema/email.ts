// import { getPasswordStrength } from '@/utils/tools';
import { isDisposableEmail } from 'disposable-email-domains-js';
import { z } from 'zod';
// export const loginParamsSchema = z
//   .object({
//     email: z.string().email({ message: 'Invalid email format' }),
//     password: z
//       .string()
//       .refine((pw) => getPasswordStrength(pw) >= 50, { message: 'Password is too weak' })
//   })
//   .passthrough();
// export const registerParamsSchema = z
//   .object({
//     email: z
//       .string()
//       .email({ message: 'Invalid email format' })
//       .refine((e) => !isDisposableEmail(e), 'Invalid email'),
//     password: z
//       .string()
//       .refine((pw) => getPasswordStrength(pw) >= 50, { message: 'Password is too weak' }),
//     firstName: z.string().min(1, { message: 'FirstName is required' }),
//     lastName: z.string().min(1, { message: 'LastName is required' }),
//     country: z.enum(['US'], { message: 'Invalid country code' }).default('US'),
//     language: z.enum(['en', 'zh'], { message: 'Invalid language code' }).default('en')
//   })
//   .passthrough();

export const emailCheckParamsSchema = z.object({
  email: z
    .string()
    .email({ message: 'Invalid email format' })
    .refine((e) => !isDisposableEmail(e), 'Invalid email')
});

// export type ILoginParams = z.infer<typeof loginParamsSchema>;
// export type IRegisterParams = z.infer<typeof registerParamsSchema>;
export type IEmailCheckParams = z.infer<typeof emailCheckParamsSchema>;
