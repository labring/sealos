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
      const essentialHeaders = ['cache-control', 'connection', 'content-type'];
      response.headers.forEach((value, key) => {
        const lowerKey = key.toLowerCase();
        if (essentialHeaders.includes(lowerKey)) {
          res.setHeader(key, value);
        }
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

export function getToolsList(path: string, region: string = 'en'): string {
  const isEN = region === 'en';
  const texts = {
    apiTitle: isEN ? 'MCP Tools List' : 'MCP 工具列表',
    introText: (apiName: string) =>
      isEN
        ? `${apiName} Tool is used to access and manage related reNources. This tool provides complete functionality, allowing you to easily operate and use various services suitable for your project needs.`
        : `${apiName} Tool 用于访问和管理相关资源。该工具提供了完整的功能，让您能够轻松操作和使用适合项目需求的各种服务。`,
    authText: isEN
      ? 'When using these tools, you need to ensure you have valid authentication credentials and sufficient permissions to access the target resources.'
      : '在使用这些工具的时候，您需要确认您有效的认证凭据，并确保有足够的权限访问目标资源。',
    paramDesc: isEN ? '**Parameter Description:**' : '**参数说明：**',
    required: isEN ? '(Required)' : '（必填）',
    optional: isEN ? '(Optional)' : '（可选）',
    defaultValue: (value: any) => (isEN ? `(Default: ${value})` : `（默认：${value}）`),
    separator: isEN ? ', ' : '，',
    availableValues: (values: any[]) =>
      isEN
        ? `Available values: ${values.map((v: any) => `\`${v}\``).join(', ')}`
        : `可选值：${values.map((v: any) => `\`${v}\``).join('、')}`,
    noParams: isEN ? 'This tool does not require any parameters.' : '此工具不需要任何参数。'
  };
  const toolsMap = OpenAPIToolsParser.loadAndParseOpenAPISpec({
    openApiSpec: path
  });
  const apiName = path.split('/').pop()?.split('.')[0] || 'API';
  let markdown = `# ${texts.apiTitle}\n\n\n`;
  markdown += `${texts.introText(apiName)}\n\n`;
  markdown += `${texts.authText}\n\n\n`;
  for (const [toolName, tool] of toolsMap.entries()) {
    markdown += `## ${tool.name}\n\n`;
    if (tool.description) {
      markdown += `${tool.description}\n\n`;
    }
    if (
      tool.inputSchema &&
      tool.inputSchema.properties &&
      Object.keys(tool.inputSchema.properties).length > 0
    ) {
      markdown += `${texts.paramDesc}\n\n`;
      const properties = tool.inputSchema.properties;
      const required = tool.inputSchema.required || [];

      for (const [paramName, paramDetails] of Object.entries(properties)) {
        const isRequired = required.includes(paramName) ? texts.required : texts.optional;
        let paramDescription = paramDetails.description || '';
        let defaultValue =
          paramDetails.default !== undefined ? texts.defaultValue(paramDetails.default) : '';
        if (paramDetails.enum && Array.isArray(paramDetails.enum)) {
          paramDescription += paramDescription ? texts.separator : '';
          paramDescription += texts.availableValues(paramDetails.enum);
        }
        markdown += `- \`${paramName}\`：${paramDescription}${isRequired}${defaultValue}\n`;
      }
    } else {
      markdown += `${texts.noParams}\n`;
    }
    markdown += '\n---\n\n';
  }
  return markdown;
}
