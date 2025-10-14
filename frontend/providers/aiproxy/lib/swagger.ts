import { createSwaggerSpec } from "next-swagger-doc"

export const getApiDocs = async () => {
  const spec = createSwaggerSpec({
    apiFolder: "app/api",
    definition: {
      openapi: "3.0.0",
      info: {
        title: "AI Proxy API Docs",
        version: "1.0.0",
        contact: {
          name: "AI Proxy Team",
          url: "https://github.com/labring/aiproxy",
        },
      },
      servers: [
        {
          url:
            process.env.NODE_ENV === "production"
              ? "https://your-domain.com/api"
              : "http://localhost:3000/api",
          description: process.env.NODE_ENV === "production" ? "生产环境" : "开发环境",
        },
      ],
      components: {
        securitySchemes: {
          BearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
            description: "JWT Bearer 令牌认证，用于应用级别的身份验证",
          },
          KCAuth: {
            type: "http",
            scheme: "bearer",
            description: "Kubernetes Kubeconfig 身份认证令牌，用于 Sealos 集群用户身份验证",
          },
        },
        schemas: {
          // 通用响应格式 - 基础版本（无 data）
          ApiResp: {
            type: "object",
            properties: {
              code: {
                type: "integer",
                description: "HTTP 状态码",
                example: 200,
              },
              message: {
                type: "string",
                description: "响应消息，提供操作结果的描述",
                example: "操作成功",
              },
              error: {
                type: "string",
                description: "错误信息（仅在请求失败时返回）",
                example: null,
              },
            },
            required: ["code"],
          },
          // 通用响应格式 - 带数据版本
          ApiRespWithData: {
            type: "object",
            properties: {
              code: {
                type: "integer",
                description: "HTTP 状态码",
                example: 200,
              },
              message: {
                type: "string",
                description: "响应消息",
                example: "获取成功",
              },
              data: {
                type: "object",
                description: "响应数据对象",
              },
              error: {
                type: "string",
                description: "错误信息（仅在请求失败时返回）",
                example: null,
              },
            },
            required: ["code"],
          },
          // 错误响应
          ErrorResp: {
            type: "object",
            properties: {
              code: {
                type: "integer",
                description: "HTTP 错误状态码",
                enum: [400, 401, 403, 404, 500],
                example: 400,
              },
              message: {
                type: "string",
                description: "用户友好的错误消息",
                example: "请求参数错误",
              },
              error: {
                type: "string",
                description: "详细的错误信息，用于调试",
                example: "Token ID is required",
              },
            },
            required: ["code", "message", "error"],
          },
        },
        responses: {
          // 通用成功响应
          Success: {
            description: "操作成功",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ApiResp",
                },
              },
            },
          },
          // 通用错误响应
          BadRequest: {
            description: "请求参数错误",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorResp",
                },
                example: {
                  code: 400,
                  message: "请求参数错误",
                  error: "Invalid request parameters",
                },
              },
            },
          },
          Unauthorized: {
            description: "未授权或认证失败",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorResp",
                },
                example: {
                  code: 401,
                  message: "认证失败",
                  error: "Authentication failed",
                },
              },
            },
          },
          Forbidden: {
            description: "权限不足",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorResp",
                },
                example: {
                  code: 403,
                  message: "权限不足",
                  error: "Insufficient permissions",
                },
              },
            },
          },
          NotFound: {
            description: "资源不存在",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorResp",
                },
                example: {
                  code: 404,
                  message: "资源不存在",
                  error: "Resource not found",
                },
              },
            },
          },
          InternalServerError: {
            description: "服务器内部错误",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorResp",
                },
                example: {
                  code: 500,
                  message: "服务器内部错误",
                  error: "Internal server error",
                },
              },
            },
          },
        },
      },
      tags: [
        {
          name: "Tokens",
          description: "Token 管理相关接口 - 用于创建、查询、更新和删除 API Token",
        },
        {
          name: "Dashboard",
          description: "仪表盘数据统计接口 - 用于获取 API 使用情况、费用统计等数据",
        },
        {
          name: "Logs",
          description: "日志查询相关接口 - 用于查询和检索 API 调用日志记录",
        },
      ],
    },
  })

  return spec
}
