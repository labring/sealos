import { writeFileSync } from 'fs';
import { openApiDocument } from '../app/api/openapi';

const openApiJson = JSON.stringify(openApiDocument, null, 2);

writeFileSync('openapi.json', openApiJson);

console.log('OpenAPI documentation has been generated successfully!');
