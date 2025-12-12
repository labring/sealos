import { z } from 'zod';

export const ProviderTypeSchema = z.enum(['EMAIL', 'PHONE']);
export type ProviderType = z.infer<typeof ProviderTypeSchema>;

export const AlertNotificationAccountSchema = z.object({
  id: z.string(),
  userUid: z.string(),
  providerType: ProviderTypeSchema,
  providerId: z.string(),
  isEnabled: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string()
});
export type AlertNotificationAccount = z.infer<typeof AlertNotificationAccountSchema>;

export const CreateAlertRequestSchema = z.object({
  providerType: ProviderTypeSchema,
  providerId: z.string(),
  code: z.string()
});
export type CreateAlertRequest = z.infer<typeof CreateAlertRequestSchema>;

export const CreateAlertResponseSchema = z.object({
  id: z.string(),
  userUid: z.string(),
  providerType: ProviderTypeSchema,
  providerId: z.string()
});
export type CreateAlertResponse = z.infer<typeof CreateAlertResponseSchema>;

export const ListAlertsResponseSchema = z.array(AlertNotificationAccountSchema);
export type ListAlertsResponse = z.infer<typeof ListAlertsResponseSchema>;

export const ToggleAlertsRequestSchema = z.object({
  ids: z.array(z.string()),
  isEnabled: z.boolean()
});
export type ToggleAlertsRequest = z.infer<typeof ToggleAlertsRequestSchema>;

export const ToggleAlertsResponseSchema = z.object({
  updatedCount: z.number(),
  updatedIDs: z.array(z.string())
});
export type ToggleAlertsResponse = z.infer<typeof ToggleAlertsResponseSchema>;

export const DeleteAlertsRequestSchema = z.object({
  ids: z.array(z.string())
});
export type DeleteAlertsRequest = z.infer<typeof DeleteAlertsRequestSchema>;

export const DeleteAlertsResponseSchema = z.object({
  deletedCount: z.number(),
  deletedIds: z.array(z.string())
});
export type DeleteAlertsResponse = z.infer<typeof DeleteAlertsResponseSchema>;
