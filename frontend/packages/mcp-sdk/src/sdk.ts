import { createMcpHandler } from '@vercel/mcp-adapter';
import { OpenAPIToolsParser } from './openapi.ts';
import { executeHttpRequest, convertToZodProperties } from './httprequest.ts';

import { AsyncLocalStorage } from 'async_hooks';

export function McpHandler(path: string, url: string) {
  const requestContextStorage = new AsyncLocalStorage();
  const tools = OpenAPIToolsParser.loadAndParseOpenAPISpec({
    openApiSpec: path
  });
  const baseHandler = createMcpHandler(
    (server) => {
      tools.forEach((tool, id) => {
        const zodProperties = convertToZodProperties(tool.inputSchema);
        server.tool(tool.name, tool.description, zodProperties, async (params) => {
          const context = requestContextStorage.getStore();
          const headers = context ? context.headers : {};
          console.log(`Request headers when executing tool ${tool.name}:`, headers);
          const createUserResult = await executeHttpRequest(id, tool.name, params, url, headers);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(createUserResult)
              }
            ]
          };
        });
      });
    },
    {
      capabilities: {
        tools: {
          echo: {
            description: 'Echo a message'
          }
        }
      }
    },
    {
      redisUrl: process.env.REDIS_URL,
      basePath: '/api',
      verboseLogs: true,
      maxDuration: 60
    }
  );

  return async function (request: Request): Promise<Response> {
    // Extract request headers
    const headersObj = Object.fromEntries(request.headers.entries());
    console.log('Received request, headers:', headersObj);

    // Create request context
    const requestContext = {
      headers: headersObj
    };

    // Run request handler with async local storage
    return await requestContextStorage.run(requestContext, async () => {
      try {
        return await baseHandler(request);
      } catch (error) {
        console.error('Error processing request:', error);
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    });
  };
}
