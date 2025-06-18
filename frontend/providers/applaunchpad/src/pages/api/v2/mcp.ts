import { NextApiRequest, NextApiResponse } from 'next';
import { createMcpHandler } from '@vercel/mcp-adapter';

const mcpHandler = createMcpHandler(
  (server) => {
    server.tool(
      'roll_dice',
      'Rolls an N-sided die',
      {
        type: 'object',
        properties: {
          sides: {
            type: 'number',
            description: 'Number of sides on the die',
            minimum: 2,
            maximum: 100
          }
        },
        required: ['sides']
      },
      async (args: any) => {
        const sides = args.sides as number;
        const value = 1 + Math.floor(Math.random() * sides);
        return {
          content: [{ type: 'text', text: `🎲 You rolled a ${value} on a ${sides}-sided die!` }]
        };
      }
    );

    server.tool(
      'get_app_info',
      'Get application information from App Launchpad',
      {
        type: 'object',
        properties: {
          appName: {
            type: 'string',
            description: 'Name of the application to get info for'
          }
        }
      },
      async (args: any) => {
        const appName = args?.appName as string | undefined;
        return {
          content: [
            {
              type: 'text',
              text: appName
                ? `Getting information for app: ${appName}`
                : 'Getting all application information from App Launchpad'
            }
          ]
        };
      }
    );

    server.tool(
      'deploy_app',
      'Deploy an application in App Launchpad',
      {
        type: 'object',
        properties: {
          appName: {
            type: 'string',
            description: 'Name of the application to deploy'
          },
          image: {
            type: 'string',
            description: 'Docker image to deploy'
          },
          replicas: {
            type: 'number',
            description: 'Number of replicas',
            minimum: 1,
            maximum: 10,
            default: 1
          }
        },
        required: ['appName', 'image']
      },
      async (args: any) => {
        const { appName, image, replicas = 1 } = args;
        return {
          content: [
            {
              type: 'text',
              text: `Deploying app "${appName}" with image "${image}" and ${replicas} replica(s) in Sealos App Launchpad...`
            }
          ]
        };
      }
    );
  },
  {},
  {
    basePath: '/api/v2',
    maxDuration: 60,
    verboseLogs: process.env.NODE_ENV === 'development'
  }
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const transport = req.query.transport as string;

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

    const response = await mcpHandler(request);

    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });

    res.status(response.status);

    if (response.body) {
      const responseData = await response.text();
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
}
