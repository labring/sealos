import 'zod-openapi/extend';
import { z } from 'zod';

const TemplateSchema = z.object({
  uid: z.string().openapi({
    description: 'Template Uid'
  }),
  name: z.string().openapi({
    description: 'Template name'
  }),
  image: z.string().openapi({
    description: 'Template image'
  }),
  config: z.string().openapi({
    description: 'Template configuration in JSON format'
  }),
  createdAt: z.string().openapi({
    description: 'Creation timestamp'
  }),
  updatedAt: z.string().openapi({
    description: 'Last update timestamp'
  })
});

export const RequestSchema = z.object({
  templateRepositoryUid: z.string().openapi({
    description: 'Repository unique identifier to list templates from'
  })
});

export const SuccessResponseSchema = z.object({
  data: z.array(TemplateSchema).openapi({
    description: 'List of templates in the repository'
  })
});
