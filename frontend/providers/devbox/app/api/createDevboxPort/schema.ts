import { z } from 'zod';
import { ProtocolType } from '@/types/devbox';

export const HeaderSchema = z.object({
  Authorization: z.string().describe('Use kubeconfig to login')
});

export const RequestSchema = z.object({
  devboxName: z.string().min(1).describe('Devbox name'),
  port: z.number().min(1).max(65535).describe('Port number to check'),
  protocol: z.enum(['HTTP', 'GRPC', 'WS']).default('HTTP').describe('Protocol type')
});

export const PortInfoSchema = z.object({
  portName: z.string().describe('Port name'),
  port: z.number().describe('Port number'),
  protocol: z.string().describe('Protocol type'),
  networkName: z.string().optional().describe('Network name'),
  openPublicDomain: z.boolean().describe('Whether public domain is enabled'),
  publicDomain: z.string().optional().describe('Public domain'),
  customDomain: z.string().optional().describe('Custom domain'),
  internalAddress: z.string().describe('Internal address'),
  externalAddress: z.string().optional().describe('External address')
});

export const SuccessResponseSchema = z.object({
  data: z.object({
    portName: z.string().describe('Port name'),
    port: z.number().describe('Port number'),
    protocol: z.enum(['HTTP', 'GRPC', 'WS']).describe('Protocol type'),
    networkName: z.string().optional().describe('Network name'),
    openPublicDomain: z.boolean().describe('Whether public domain is enabled'),
    publicDomain: z.string().optional().describe('Public domain'),
    customDomain: z.string().optional().describe('Custom domain')
  })
});

export const ErrorResponseSchema = z.object({
  code: z.number(),
  message: z.string().optional(),
  error: z.any().optional()
});
