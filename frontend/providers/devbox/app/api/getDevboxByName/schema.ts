import { z } from 'zod';

export const RequestSchema = z.object({
  devboxName: z.string().min(1).describe('Devbox name')
});

export const TemplateRepositorySchema = z.object({
  uid: z.string().describe('Runtime ID'),
  iconId: z.string().describe('Runtime Icon'),
  name: z.string().describe('Runtime Name'),
  kind: z.string().describe('Runtime Kind')
});

export const TemplateSchema = z.object({
  templateRepository: TemplateRepositorySchema,
  uid: z.string().describe('Runtime Specific Version ID'),
  image: z.string().describe('Runtime Specific Version Image'),
  name: z.string().describe('Runtime Specific Version Name')
});

export const PortInfoSchema = z.object({
  portName: z.string().describe('Port Name'),
  port: z.number().describe('Port'),
  protocol: z.string().describe('Protocol'),
  networkName: z.string().optional().describe('Network Name'),
  openPublicDomain: z.boolean().describe('Open Public Domain'),
  publicDomain: z.string().optional().describe('Public Domain'),
  customDomain: z.string().optional().describe('Custom Domain')
});

export const SuccessResponseSchema = z.object({
  data: z.object({
    name: z.string().describe('Devbox name'),
    templateID: z.string().describe('Runtime Specific Version ID'),
    templateRepositoryID: z.string().describe('Runtime ID'),
    templateRepositoryName: z.string().describe('Runtime Name'),
    templateRepositoryIcon: z.string().describe('Runtime Icon'),
    templateRepositoryKind: z.string().describe('Runtime Kind'),
    templateName: z.string().describe('Runtime Specific Version Name'),
    templateImage: z.string().describe('Runtime Specific Version Image'),
    cpu: z.number().describe('CPU'),
    memory: z.number().describe('Memory'),
    gpu: z
      .object({
        manufacturers: z.string(),
        type: z.string(),
        amount: z.number()
      })
      .optional()
      .describe('GPU'),
    status: z.string().describe('Status'),
    portInfos: z.array(PortInfoSchema).describe('Port Infos')
  })
});

export const ErrorResponseSchema = z.object({
  code: z.number(),
  error: z.string()
});
