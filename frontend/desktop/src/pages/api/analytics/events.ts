import { createAppAnalyticsHandler } from '@/services/backend/app-analytics/handler';

export const config = { api: { bodyParser: { sizeLimit: '8kb' } } };

export default createAppAnalyticsHandler();
