import { z } from 'zod';

export const MonitorChartDataResultSchema = z.object({
  xData: z.array(z.number()),
  yData: z.array(
    z.object({
      name: z.string().optional(),
      data: z.array(z.number())
    })
  )
});
