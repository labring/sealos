import { z } from 'zod';
import { customAlphabet } from 'nanoid';
export const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz', 12);

const GpuSchema = z
  .object({
    manufacturers: z.string().default('nvidia').describe('GPU manufacturers'),
    type: z.string().default('').describe('GPU type'),
    amount: z.number().default(1).describe('GPU amount')
  })
  .optional();

const NetworkSchema = (devboxName: string) =>
  z.object({
    networkName: z
      .string()
      .optional()
      .default(`${devboxName}-${nanoid()}`)
      .describe('Network name'),
    portName: z.string().optional().default(`${nanoid()}`).describe('Port name'),
    port: z
      .number()
      .min(1)
      .max(65535)
      .default(3000)
      .describe(
        'Port number, this port can be found in the /templateRepository/template/list response data JSON templateList config (you need to call this interface before creating a Devbox)'
      ),
    protocol: z.enum(['HTTP', 'GRPC', 'WS']).optional().default('HTTP').describe('Protocol'),
    openPublicDomain: z.boolean().default(true).describe('Open public domain'),
    publicDomain: z
      .string()
      .optional()
      .default(`${nanoid()}.${process.env.INGRESS_DOMAIN}`)
      .describe('Public domain, no need to fill in'),
    customDomain: z.string().optional().default('').describe('Custom domain, no need to fill in')
  });

export const DevboxFormSchema = z
  .object({
    name: z.string().min(1).describe('Devbox name'),
    templateUid: z.string().min(1).describe('Template UID'),
    templateRepositoryUid: z.string().min(1).describe('Template Repository UID'),
    templateConfig: z.string().default('{}').describe('Template configuration in JSON format'),
    image: z.string().default('').describe('Container image'),
    cpu: z
      .number()
      .min(0)
      .default(2000)
      .describe(
        'CPU cores, it is recommended to use options like 1000, 2000, 4000, 8000, 16000, representing 1Core, 2Core, 4Core, 8Core, 16Core'
      ),
    memory: z
      .number()
      .min(0)
      .default(4096)
      .describe(
        'Memory in MB, it is recommended to use options like 2048, 4096, 8192, 16384, 32768, representing 2G, 4G, 8G, 16G, 32G'
      ),
    gpu: GpuSchema.optional().describe('GPU configuration, usually empty'),
    networks: z.array(z.any()).default([]).describe('Network configurations')
  })
  .transform((data) => {
    return {
      ...data,
      networks: data.networks.map((network: any) => NetworkSchema(data.name).parse(network))
    };
  });

export const RequestSchema = z.object({
  devboxForm: DevboxFormSchema
});

export const SuccessResponseSchema = z.object({
  data: z.string().default('success')
});
