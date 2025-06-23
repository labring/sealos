import axios from 'axios';
import https from 'https';
import { z } from 'zod';

export async function executeHttpRequest(
  toolId: string,
  toolName: string,
  params: any,
  apiBaseUrl: string,
  headers: Record<string, string> = {}
): Promise<{ content: Array<{ type: string; text: string }> }> {
  console.error(`Executing tool: ${toolId} (${toolName})`);

  // Only keep authentication-related headers
  const cleanedHeaders: Record<string, string> = {};

  // Preserve authorization-related headers
  if (headers.authorization) {
    cleanedHeaders.Authorization = headers.authorization;
  }
  if (headers.Authorization) {
    cleanedHeaders.Authorization = headers.Authorization;
  }
  // Output cleaned headers
  console.log(`Transformed headers: ${JSON.stringify(cleanedHeaders, null, 2)}`);
  try {
    const [method, ...pathParts] = toolId.split('-');
    const path = '/' + pathParts.join('/').replace(/-/g, '/');
    const baseUrl = apiBaseUrl.endsWith('/') ? apiBaseUrl : `${apiBaseUrl}/`;
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    const url = new URL(cleanPath, baseUrl).toString();
    const config: any = {
      method: method.toLowerCase(),
      url: url,
      headers: cleanedHeaders
    };
    if (method.toLowerCase() === 'get') {
      if (params && typeof params === 'object') {
        const queryParams: Record<string, string> = {};
        for (const [key, value] of Object.entries(params)) {
          if (Array.isArray(value)) {
            queryParams[key] = value.join(',');
          } else if (value !== undefined && value !== null) {
            queryParams[key] = String(value);
          }
        }
        config.params = queryParams;
      }
    } else {
      config.data = params;
    }
    console.error(`Processed parameters:`, config.params || config.data);
    console.error('Final request config:', config);
    const response = await axios(config);
    console.error('Response status:', response.status);
    console.error('Response headers:', response.headers);
    console.error('Response data:', response.data);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response.data, null, 2)
        }
      ]
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Request failed:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        headers: error.response?.headers
      });
      throw new Error(
        `API request failed: ${error.message} - ${JSON.stringify(error.response?.data)}`
      );
    }
    throw error;
  }
}

export function convertToZodProperties(schema: {
  type: string;
  properties: Record<string, any>;
  required?: string[];
}): z.ZodRawShape {
  const zodProperties: z.ZodRawShape = {};
  for (const [key, prop] of Object.entries(schema.properties)) {
    switch (prop.type) {
      case 'string':
        zodProperties[key] = z.string();
        break;
      case 'number':
        zodProperties[key] = z.number();
        break;
      case 'boolean':
        zodProperties[key] = z.boolean();
        break;
      case 'integer':
        zodProperties[key] = z.number().int();
      default:
        zodProperties[key] = z.any();
    }

    if (!schema.required?.includes(key)) {
      zodProperties[key] = zodProperties[key].optional();
    }
  }

  return zodProperties;
}
