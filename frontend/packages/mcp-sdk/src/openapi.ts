// openapi-tools.ts

import { OpenAPIV3 } from 'openapi-types';
import path from 'path';
import * as fs from 'fs';

export interface Tool {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

function getOpenApiSpecPath(specPath: any) {
  if (typeof specPath !== 'string') {
    throw new Error('Invalid OpenAPI spec path');
  }
  const normalizedPath = path.normalize(specPath).replace(/^(\.\.(\/|\\|$))+/, '');
  const fullPath = path.resolve(process.cwd(), normalizedPath);
  const baseDir = process.cwd();
  if (!fullPath.startsWith(baseDir)) {
    throw new Error('Access to paths outside the base directory is not allowed');
  }
  if (!fs.existsSync(fullPath)) {
    throw new Error(`OpenAPI spec file not found: ${normalizedPath}`);
  }
  return fullPath;
}

export class OpenAPIToolsParser {
  public static loadAndParseOpenAPISpec(config: {
    openApiSpec: string | OpenAPIV3.Document;
  }): Map<string, Tool> {
    const tools = new Map<string, Tool>();
    let spec: OpenAPIV3.Document;
    try {
      const resolvedPath = getOpenApiSpecPath(config.openApiSpec);
      const content = fs.readFileSync(resolvedPath, 'utf-8');
      spec = JSON.parse(content);
    } catch (error) {
      // @ts-ignore
      throw new Error(`Failed to parse OpenAPI spec: ${error.message}`);
    }
    // @ts-ignore
    for (const [path, pathItem] of Object.entries(spec.paths)) {
      if (!pathItem) continue;
      for (const [method, operation] of Object.entries(pathItem)) {
        if (method === 'parameters' || !operation) continue;

        const op = operation as OpenAPIV3.OperationObject;
        const cleanPath = path.replace(/^\//, '');
        const toolId = `${method.toUpperCase()}-${cleanPath}`.replace(/[^a-zA-Z0-9-]/g, '-');

        const tool: Tool = {
          // @ts-ignore
          name: op.summary,
          description: op.description || 'No description available',
          inputSchema: {
            type: 'object',
            properties: {},
            required: undefined
          }
        };
        if (op.parameters) {
          for (const param of op.parameters) {
            if ('name' in param && 'in' in param) {
              const paramSchema = param.schema as OpenAPIV3.SchemaObject;
              tool.inputSchema.properties[param.name] = {
                type: paramSchema?.type || 'string',
                description: param.description || `${param.name} parameter`
              };

              if (param.required) {
                tool.inputSchema.required = tool.inputSchema.required || [];
                tool.inputSchema.required.push(param.name);
              }
            }
          }
        }
        if (op.requestBody) {
          const requestBody = op.requestBody as OpenAPIV3.RequestBodyObject;
          if (requestBody.content) {
            const jsonContent = requestBody.content['application/json'];
            if (jsonContent && jsonContent.schema) {
              const schema = jsonContent.schema as OpenAPIV3.SchemaObject;
              if (schema.properties) {
                for (const [propName, propSchema] of Object.entries(schema.properties)) {
                  const propSchemaObj = propSchema as OpenAPIV3.SchemaObject;
                  tool.inputSchema.properties[propName] = {
                    type: propSchemaObj.type || 'string',
                    description: propSchemaObj.description || `${propName} property`
                  };
                }
              }
              if (schema.required) {
                tool.inputSchema.required = tool.inputSchema.required || [];
                tool.inputSchema.required = [...tool.inputSchema.required, ...schema.required];
              }
            }
          }
        }
        tools.set(toolId, tool);
      }
    }
    return tools;
  }
}
export type { OpenAPIV3 };
