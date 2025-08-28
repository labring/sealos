import { z } from 'zod';

// 基础类型定义
export const SubscriptionTypeSchema = z.enum(['SUBSCRIPTION', 'PAYG']);
export type SubscriptionType = z.infer<typeof SubscriptionTypeSchema>;

export const PaymentMethodSchema = z.enum(['STRIPE', 'BALANCE']);
export type PaymentMethod = z.infer<typeof PaymentMethodSchema>;

export const OperatorSchema = z.enum(['created', 'upgraded', 'downgraded', 'renewed', 'canceled']);
export type Operator = z.infer<typeof OperatorSchema>;

// Stripe 信息
export const StripeInfoSchema = z.object({
  subscriptionId: z.string(),
  customerId: z.string()
});
export type StripeInfo = z.infer<typeof StripeInfoSchema>;

// 套餐价格
export const PlanPriceSchema = z.object({
  ID: z.string(),
  ProductID: z.string(),
  BillingCycle: z.string(),
  Price: z.number(),
  CreatedAt: z.string(),
  UpdatedAt: z.string()
});
export type PlanPrice = z.infer<typeof PlanPriceSchema>;

// 订阅套餐
export const SubscriptionPlanSchema = z.object({
  ID: z.string(),
  Name: z.string(),
  Description: z.string(),
  UpgradePlanList: z.array(z.string()).nullable(),
  DowngradePlanList: z.array(z.string()).nullable(),
  MaxSeats: z.number(),
  MaxResources: z.string(),
  Traffic: z.number(),
  Prices: z.array(PlanPriceSchema),
  CreatedAt: z.string(),
  UpdatedAt: z.string()
});

export type SubscriptionPlan = z.infer<typeof SubscriptionPlanSchema>;

// 工作空间订阅
export const WorkspaceSubscriptionSchema = z.object({
  ID: z.string(),
  PlanName: z.string(),
  Workspace: z.string(),
  RegionDomain: z.string(),
  UserUID: z.string(),
  Status: z.string(),
  PayStatus: z.string(),
  PayMethod: z.string(),
  Stripe: StripeInfoSchema.nullable(),
  TrafficStatus: z.string(),
  CurrentPeriodStartAt: z.string(),
  CurrentPeriodEndAt: z.string(),
  CancelAtPeriodEnd: z.boolean(),
  CancelAt: z.string(),
  CreateAt: z.string(),
  UpdateAt: z.string(),
  ExpireAt: z.string().nullable(),
  Traffic: z.array(z.any()).nullable(),
  type: SubscriptionTypeSchema
});
export type WorkspaceSubscription = z.infer<typeof WorkspaceSubscriptionSchema>;

// 订阅变更流水
export const SubscriptionTransactionSchema = z.object({
  id: z.string(),
  from: z.string(),
  workspace: z.string(),
  region_domain: z.string(),
  user_uid: z.string(),
  old_plan_name: z.string(),
  new_plan_name: z.string(),
  old_plan_status: z.string(),
  operator: z.string(),
  start_at: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  status: z.string(),
  status_desc: z.string(),
  pay_status: z.string(),
  pay_id: z.string(),
  period: z.string(),
  amount: z.number()
});
export type SubscriptionTransaction = z.infer<typeof SubscriptionTransactionSchema>;

// 请求类型
export const WorkspaceSubscriptionRequestSchema = z.object({
  workspace: z.string(),
  regionDomain: z.string()
});
export type WorkspaceSubscriptionRequest = z.infer<typeof WorkspaceSubscriptionRequestSchema>;

export const UpgradeAmountRequestSchema = WorkspaceSubscriptionRequestSchema.extend({
  planName: z.string(),
  period: z.enum(['1m', '1y']), // 订阅周期：1m=1个月，1y=1年（需与套餐价格表的 billing_cycle 匹配）
  payMethod: PaymentMethodSchema,
  operator: z.literal('upgraded')
});
export type UpgradeAmountRequest = z.infer<typeof UpgradeAmountRequestSchema>;

export const SubscriptionPayRequestSchema = WorkspaceSubscriptionRequestSchema.extend({
  planName: z.string(),
  period: z.enum(['1m', '1y']), // 订阅周期：1m=1个月，1y=1年（需与套餐价格表的 billing_cycle 匹配）
  payMethod: PaymentMethodSchema, // 支付方式：STRIPE 或 BALANCE
  operator: OperatorSchema,
  cardId: z.string().optional()
});
export type SubscriptionPayRequest = z.infer<typeof SubscriptionPayRequestSchema>;

// 响应类型
export const SubscriptionInfoResponseSchema = z.object({
  subscription: WorkspaceSubscriptionSchema
});
export type SubscriptionInfoResponse = z.infer<typeof SubscriptionInfoResponseSchema>;

export const PlanListResponseSchema = z.object({
  plans: z.array(SubscriptionPlanSchema)
});
export type PlanListResponse = z.infer<typeof PlanListResponseSchema>;

export const LastTransactionResponseSchema = z.object({
  transaction: SubscriptionTransactionSchema.optional()
});
export type LastTransactionResponse = z.infer<typeof LastTransactionResponseSchema>;

export const UpgradeAmountResponseSchema = z.object({
  amount: z.number()
});
export type UpgradeAmountResponse = z.infer<typeof UpgradeAmountResponseSchema>;

export const PaymentResponseSchema = z.object({
  success: z.boolean(),
  redirectUrl: z.string().optional(),
  message: z.string().optional()
});
export type PaymentResponse = z.infer<typeof PaymentResponseSchema>;

export const WorkspaceSubscriptionListResponseSchema = z.object({
  subscriptions: z.array(WorkspaceSubscriptionSchema)
});

export type WorkspaceSubscriptionListResponse = z.infer<
  typeof WorkspaceSubscriptionListResponseSchema
>;
