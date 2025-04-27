import { ApiReference } from '@scalar/nextjs-api-reference';
import { openApiDocument } from '../api/openapi';
const config = {
  spec: {
    content: openApiDocument
  }
};

export const GET = ApiReference(config);
