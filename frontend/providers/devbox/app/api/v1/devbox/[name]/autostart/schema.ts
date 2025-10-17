import 'zod-openapi/extend';
import { z } from 'zod';

const AutostartRequestSchema = z.object({
  execCommand: z.string().optional().openapi({
    description: 'Custom command to execute in the devbox (optional)',
    example: '/bin/bash /home/devbox/project/entrypoint.sh'
  })
}).optional().default({}).openapi({
  description: 'Request body for autostart configuration (optional, can be empty)'
});

const AutostartSuccessResponseSchema = z.object({
  data: z.object({
    devboxName: z.string().openapi({
      description: 'Devbox name'
    }),
    autostartCreated: z.boolean().openapi({
      description: 'Whether autostart resources were created successfully'
    }),
    jobRecreated: z.boolean().openapi({
      description: 'Whether the job was deleted and recreated'
    }),
    resources: z.array(z.string()).openapi({
      description: 'List of created Kubernetes resources'
    })
  })
}).openapi({
  description: 'Successful autostart configuration response'
});

const AutostartErrorResponseSchema = z.object({
  code: z.number().openapi({
    description: 'Error code'
  }),
  message: z.string().openapi({
    description: 'Error message'
  }),
  error: z.any().optional().openapi({
    description: 'Detailed error information'
  })
}).openapi({
  description: 'Error response for autostart configuration'
});

export {
  AutostartRequestSchema,
  AutostartSuccessResponseSchema,
  AutostartErrorResponseSchema
};
