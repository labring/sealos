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

export class OpenAPIToolsParser {
  public static loadAndParseOpenAPISpec(config: {
    openApiSpec: string | OpenAPIV3.Document;
  }): Promise<Map<string, Tool>> {
    const tools = new Map<string, Tool>();
    let spec: OpenAPIV3.Document;
    try {
      const resolvedPath = path.resolve(process.cwd(), config.openApiSpec);
      const content = fs.readFileSync(resolvedPath, 'utf-8');
      spec = JSON.parse(content);
    } catch (error) {
      // @ts-ignore
      throw new Error(`Failed to parse OpenAPI spec: ${error.message}`);
    }
    // @ts-ignore
    const info = spec.info.description || 'No description available';
    // @ts-ignore
    for (const [path, pathItem] of Object.entries(spec.paths)) {
      if (!pathItem) continue;

      for (const [method, operation] of Object.entries(pathItem)) {
        if (method === 'parameters' || !operation) continue;

        const op = operation as OpenAPIV3.OperationObject;
        const cleanPath = path.replace(/^\//, '');
        const toolId = `${method.toUpperCase()}-${cleanPath}`.replace(/[^a-zA-Z0-9-]/g, '-');

        const tool: Tool = {
          name: op.operationId || op.summary || `${method.toUpperCase()} ${path}`,
          description: this.extractAllDescriptions(op, info),
          inputSchema: {
            type: 'object',
            properties: {},
            required: undefined
          }
        };

        console.log(`Registering tool: ${toolId} (${tool.name})`);

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

  private static extractAllDescriptions(
    operation: OpenAPIV3.OperationObject,
    info: string
  ): string {
    let result: string[] = [];

    if (info) {
      result.push(`Prompt: ${info}`);
    }

    if (operation.description) {
      result.push(`Operation: ${operation.description}`);
    } else if (operation.summary) {
      result.push(`Operation: ${operation.summary}`);
    }

    if (operation.requestBody) {
      const requestBody = operation.requestBody as OpenAPIV3.RequestBodyObject;
      if (requestBody.description) {
        result.push(`Request Body: ${requestBody.description}`);
      }

      if (requestBody.content) {
        for (const [mediaType, mediaTypeObject] of Object.entries(requestBody.content)) {
          if (mediaTypeObject.schema) {
            const schemaDescriptions = this.extractSchemaDescriptions(
              mediaTypeObject.schema,
              `Request (${mediaType})`
            );
            result = result.concat(schemaDescriptions);
          }
        }
      }
    }

    if (operation.responses) {
      for (const [statusCode, response] of Object.entries(operation.responses)) {
        const responseObj = response as OpenAPIV3.ResponseObject;
        if (responseObj.description) {
          result.push(`Response ${statusCode}: ${responseObj.description}`);
        }
        if (responseObj.content) {
          for (const [mediaType, mediaTypeObject] of Object.entries(responseObj.content)) {
            if (mediaTypeObject.schema) {
              const schemaDescriptions = this.extractSchemaDescriptions(
                mediaTypeObject.schema,
                `Response ${statusCode} (${mediaType})`
              );
              result = result.concat(schemaDescriptions);
            }
          }
        }
      }
    }

    if (operation.parameters) {
      for (const parameter of operation.parameters) {
        const paramObj = parameter as OpenAPIV3.ParameterObject;
        if (paramObj.description) {
          result.push(`Parameter ${paramObj.name}: ${paramObj.description}`);
        }

        if (paramObj.schema) {
          const schemaDescriptions = this.extractSchemaDescriptions(
            paramObj.schema,
            `Parameter ${paramObj.name}`
          );
          result = result.concat(schemaDescriptions);
        }
      }
    }

    return result.join('\n\n');
  }

  private static extractSchemaDescriptions(
    schema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject,
    prefix: string = '',
    path: string = ''
  ): string[] {
    const descriptions: string[] = [];
    if ('$ref' in schema) {
      descriptions.push(`${prefix}${path ? ' > ' + path : ''}: Reference to ${schema.$ref}`);
      return descriptions;
    }
    const schemaObj = schema as OpenAPIV3.SchemaObject;
    if (schemaObj.description && path) {
      descriptions.push(`${prefix}${path}: ${schemaObj.description}`);
    }
    if (schemaObj.properties) {
      for (const [propName, propSchema] of Object.entries(schemaObj.properties)) {
        const newPath = path ? `${path}.${propName}` : propName;
        const propDescriptions = this.extractSchemaDescriptions(propSchema, prefix, newPath);
        descriptions.push(...propDescriptions);
      }
    }
    if (schemaObj.type === 'array' && schemaObj.items) {
      const newPath = path ? `${path}[]` : '[]';
      const itemDescriptions = this.extractSchemaDescriptions(schemaObj.items, prefix, newPath);
      descriptions.push(...itemDescriptions);
    }
    ['allOf', 'anyOf', 'oneOf'].forEach((combiner) => {
      const combiners = schemaObj[combiner as keyof OpenAPIV3.SchemaObject];
      if (combiners) {
        const schemas = combiners as (OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject)[];
        schemas.forEach((subSchema, index) => {
          const newPath = path ? `${path} (${combiner}[${index}])` : `${combiner}[${index}]`;
          const subDescriptions = this.extractSchemaDescriptions(subSchema, prefix, newPath);
          descriptions.push(...subDescriptions);
        });
      }
    });

    return descriptions;
  }
}
export type { OpenAPIV3 };
