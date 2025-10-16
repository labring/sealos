import z from 'zod';

// Define schemas
export const pathParams = z.object({
  databaseName: z.string()
});

export const body = z.object({
  resource: z.object({
    cpu: z.number().optional(),
    memory: z.number().optional(),
    storage: z.number().optional(),
    replicas: z.number().optional()
  })
});

// 响应Schema与创建接口保持一致
export const response = z.object({
  code: z.number(),
  message: z.string(),
  data: z
    .object({
      // 数据库基本信息
      id: z.string().optional(),
      name: z.string().optional(),
      dbType: z.string().optional(),
      dbVersion: z.string().optional(),
      status: z.string().optional(),
      createTime: z.string().optional(),

      // 资源信息 - 与创建接口格式一致
      resource: z.object({
        cpu: z.number(),
        memory: z.number(),
        storage: z.number(),
        replicas: z.number()
      }),

      // 单个实例资源
      cpu: z.number(),
      memory: z.number(),
      storage: z.number(),

      // 总资源
      totalResource: z.object({
        cpu: z.number(),
        memory: z.number(),
        storage: z.number()
      }),
      totalCpu: z.number(),
      totalMemory: z.number(),
      totalStorage: z.number(),

      // 更新操作信息
      operations: z
        .object({
          verticalScaling: z.boolean(),
          horizontalScaling: z.boolean(),
          volumeExpansion: z.boolean()
        })
        .optional(),

      // 更新时间
      updatedAt: z.string().optional(),

      // 操作请求
      opsRequests: z.array(z.any()).optional()
    })
    .optional()
});
