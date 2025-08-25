import { ProviderType } from 'prisma/global/generated/client';
import { z } from 'zod';

export const initRegionTokenParamsSchema = z.object({
  // regionUid: z.string({ message: 'Invalid email format' }),
  workspaceName: z
    .string()
    .min(1, { message: 'Workspace name must be at least 1 character long' })
    .max(100, { message: 'Workspace name must be at most 100 characters long' })
});
export type InitRegionTokenParams = z.infer<typeof initRegionTokenParamsSchema>;
export const loginParamsSchema = z
  .object({
    email: z.string().email({ message: 'Invalid email format' }),
    password: z.string()
  })
  .passthrough();
export const registerParamsSchema = z.object({
  providerId: z.string().email({ message: 'Invalid email format' }),
  code: z.string(),
  providerType: z.string()
});

const forgotPasswordParamsSchema = z
  .object({
    email: z.string().email({ message: 'Invalid email format' })
  })
  .passthrough();

export const registerParamsWithoutNameSchema = z.object({
  providerId: z.string()
});

export const personalInfoSchema = z.object({
  firstName: z.string().min(1, { message: 'First name is required' }),
  lastName: z.string().min(1, { message: 'Last name is required' })
});

export type IPersonalInfo = z.infer<typeof personalInfoSchema>;
export type ILoginParams = z.infer<typeof loginParamsSchema>;
export type IRegisterParams = z.infer<typeof registerParamsSchema>;
export type IForgotPasswordParams = z.infer<typeof forgotPasswordParamsSchema>;
export type IRegisterParamsWithoutName = z.infer<typeof registerParamsWithoutNameSchema>;

export interface ILoginResult {
  token: string;
  user: {
    name: string;
    avatar: string;
    userUid: string;
  };
  needInit: boolean;
}
