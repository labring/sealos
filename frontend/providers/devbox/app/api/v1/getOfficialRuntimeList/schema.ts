import 'zod-openapi/extend';
import { z } from 'zod';

const TemplateRepositorySchema = z.object({
  uid: z.string().openapi({
    description: 'Template repository unique identifier'
  }),
  name: z.string().openapi({
    description: 'Template repository name'
  })
});

export const RequestSchema = z.object({}).optional();

export const SuccessResponseSchema = z.object({
  data: z.array(TemplateRepositorySchema).openapi({
    description: 'List of official template repositories'
  })
});
