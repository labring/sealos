import { z } from 'zod';

export const SubscriptionTypeSchema = z.enum(['SUBSCRIPTION', 'PAYG']);
export type SubscriptionType = z.infer<typeof SubscriptionTypeSchema>;

export const PaymentMethodSchema = z.enum(['stripe', 'balance']);
export type PaymentMethod = z.infer<typeof PaymentMethodSchema>;

export const OperatorSchema = z.enum(['created', 'upgraded', 'downgraded', 'renewed', 'canceled']);
export type Operator = z.infer<typeof OperatorSchema>;

export const StripeInfoSchema = z.object({
  subscriptionId: z.string(),
  customerId: z.string()
});
export type StripeInfo = z.infer<typeof StripeInfoSchema>;

export const PlanPriceSchema = z.object({
  ID: z.string(),
  ProductID: z.string(),
  BillingCycle: z.string(),
  Price: z.number(),
  CreatedAt: z.string(),
  UpdatedAt: z.string()
});
export type PlanPrice = z.infer<typeof PlanPriceSchema>;

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
  UpdatedAt: z.string(),
  Tags: z.array(z.string())
});

export type SubscriptionPlan = z.infer<typeof SubscriptionPlanSchema>;

export const WorkspaceSubscriptionSchema = z.object({
  ID: z.string(),
  PlanName: z.string(),
  Workspace: z.string(),
  RegionDomain: z.string(),
  UserUID: z.string(),
  Status: z.string(), // Plan = Free. status = Paused 是无试用期， Normal 是试用期， Debt 和其他的都是过期了
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

export const SubscriptionInfoResponseSchema = z.object({
  subscription: WorkspaceSubscriptionSchema
});

export type SubscriptionInfoResponse = z.infer<typeof SubscriptionInfoResponseSchema>;

export const PlanListResponseSchema = z.object({
  plans: z.array(SubscriptionPlanSchema)
});

export type PlanListResponse = z.infer<typeof PlanListResponseSchema>;
