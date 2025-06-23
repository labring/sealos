import { createMcpHandler } from '@vercel/mcp-adapter';
import { OpenAPIToolsParser } from './openapi';
import { executeHttpRequest, convertToZodProperties } from './httprequest';
import { NextApiRequest, NextApiResponse } from 'next';
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
        server.tool(tool.name, tool.description, zodProperties, async (params: any) => {
          const context = requestContextStorage.getStore();
          // @ts-ignore
          const headers = context ? context.headers : {};
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
    const headersObj: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headersObj[key] = value;
    });

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

export function createMcpApiHandler(path: string, baseUrl: string) {
  return async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
      const protocol = req.headers['x-forwarded-proto'] || 'http';
      const host = req.headers.host;
      const url = new URL(req.url || '', `${protocol}://${host}`);
      const request = new Request(url.toString(), {
        method: req.method || 'GET',
        headers: new Headers(req.headers as Record<string, string>),
        body:
          req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH'
            ? JSON.stringify(req.body)
            : undefined
      });
      const handler = McpHandler(path, baseUrl);
      const response = await handler(request);
      response.headers.forEach((value, key) => {
        res.setHeader(key, value);
      });
      res.status(response.status);
      if (response.body) {
        const responseData = await response.text();
        // nosemgrep: javascript.express.security.audit.xss.direct-response-write.direct-response-write
        return res.send(responseData);
      } else {
        return res.end();
      }
    } catch (error: any) {
      console.error('MCP Handler Error:', error);
      return res.status(500).json({
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error?.message : undefined
      });
    }
  };
}
