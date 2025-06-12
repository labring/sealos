import 'zod-openapi/extend';
import { z } from 'zod';

export const DevboxListItemSchema = z.object({
  name: z.string().openapi({
    description: 'Devbox name'
  }),
  id: z.string().openapi({
    description: 'Devbox UID'
  })
});

export const ResponseSchema = z.object({
  data: z.array(DevboxListItemSchema)
});
