import 'zod-openapi/extend';
import { z } from 'zod';

const TemplateRepositorySchema = z.object({
  uid: z.string().openapi({
    description: 'Template repository unique identifier'
  }),
  name: z.string().openapi({
    description: 'Template repository name'
  }),
  description: z.string().openapi({
    description: 'Template repository description'
  }),
  kind: z.enum(['FRAMEWORK', 'OS', 'LANGUAGE', 'SERVICE', 'CUSTOM']).openapi({
    description: 'Template repository kind'
  }),
  iconId: z.string().openapi({
    description: 'Template repository icon Id'
  }),
  templateRepositoryTags: z
    .array(
      z.object({
        tag: z.object({
          uid: z.string().openapi({
            description: 'Tag unique identifier'
          }),
          type: z.enum(['PROGRAMMING_LANGUAGE', 'USE_CASE', 'OFFICIAL_CONTENT']).openapi({
            description: 'Tag type'
          }),
          name: z.string().openapi({
            description: 'Tag name'
          }),
          zhName: z.string().openapi({
            description: 'Tag Chinese name'
          }),
          enName: z.string().openapi({
            description: 'Tag English name'
          })
        })
      })
    )
    .openapi({
      description: 'Template repository tags'
    }),
  createdAt: z.string().openapi({
    description: 'Creation timestamp'
  }),
  updatedAt: z.string().openapi({
    description: 'Last update timestamp'
  })
});

export const RequestSchema = z.object({}).optional();

export const SuccessResponseSchema = z.object({
  data: z.array(TemplateRepositorySchema).openapi({
    description: 'List of official template repositories'
  })
});
