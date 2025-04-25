import { z } from 'zod';
import { nanoid } from '@/utils/tools';

const GpuSchema = z
  .object({
    manufacturers: z.string().default('nvidia').describe('GPU manufacturers'),
    type: z.string().default('').describe('GPU type'),
    amount: z.number().default(1).describe('GPU amount')
  })
  .optional();

const NetworkSchema = (devboxName: string) =>
  z.object({
    networkName: z.string().default(`${devboxName}-${nanoid()}`).describe('Network name'),
    portName: z.string().default('http').describe('Port name'),
    port: z.number().default(80).describe('Port number'),
    protocol: z.enum(['HTTP', 'GRPC', 'WS']).optional().default('HTTP').describe('Protocol'),
    openPublicDomain: z.boolean().default(false).describe('Open public domain'),
    publicDomain: z.string().default('').optional().describe('Public domain'),
    customDomain: z.string().default('').optional().describe('Custom domain')
  });

export const DevboxFormSchema = z
  .object({
    name: z.string().min(1).describe('Devbox name'),
    templateUid: z.string().min(1).describe('Template UID'),
    templateRepositoryUid: z.string().min(1).describe('Template Repository UID'),
    templateConfig: z.string().default('{}').describe('Template configuration in JSON format'),
    image: z.string().default('').describe('Container image'),
    cpu: z.number().min(0).default(1).describe('CPU cores'),
    memory: z.number().min(0).default(1024).describe('Memory in MB'),
    gpu: GpuSchema,
    networks: z.array(z.any()).default([]).describe('Network configurations')
  })
  .transform((data) => {
    return {
      ...data,
      networks: data.networks.map((network: any) => NetworkSchema(data.name).parse(network))
    };
  });

export const HeaderSchema = z.object({
  Authorization: z.string().describe('Use kubeconfig to login')
});

export const RequestSchema = z.object({
  devboxForm: DevboxFormSchema
});

export const SuccessResponseSchema = z.object({
  data: z.string().default('success')
});
