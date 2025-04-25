import { z } from 'zod';

const TemplateRepositorySchema = z.object({
  uid: z.string().describe('Template repository unique identifier'),
  name: z.string().describe('Template repository name'),
  description: z.string().describe('Template repository description'),
  kind: z
    .enum(['FRAMEWORK', 'OS', 'LANGUAGE', 'SERVICE', 'CUSTOM'])
    .describe('Template repository kind'),
  iconId: z.string().describe('Template repository icon Id'),
  templateRepositoryTags: z
    .array(
      z.object({
        tag: z.object({
          uid: z.string().describe('Tag unique identifier'),
          type: z
            .enum(['PROGRAMMING_LANGUAGE', 'USE_CASE', 'OFFICIAL_CONTENT'])
            .describe('Tag type'),
          name: z.string().describe('Tag name'),
          zhName: z.string().describe('Tag Chinese name'),
          enName: z.string().describe('Tag English name')
        })
      })
    )
    .describe('Template repository tags'),
  createdAt: z.string().describe('Creation timestamp'),
  updatedAt: z.string().describe('Last update timestamp')
});

export const RequestSchema = z.object({}).optional();

export const SuccessResponseSchema = z.object({
  data: z.array(TemplateRepositorySchema).describe('List of official template repositories')
});
