import axios, { AxiosInstance } from 'axios';
import { TimeRange } from '../types/common';
import { AuthService } from '../auth/auth';

export abstract class BaseMetricsService {
  protected client: AxiosInstance;
  protected authService: AuthService;
  protected baseURL: string;

  constructor(baseURL: string, authService: AuthService) {
    this.baseURL = baseURL;
    this.authService = authService;
    this.client = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    this.setupInterceptors();
  }

  protected setupInterceptors(): void {
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        throw new Error(`Metrics API request failed: ${error.message}`);
      }
    );
  }

  protected buildTimeParams(range?: TimeRange): Record<string, any> {
    if (!range) return {};

    const params: Record<string, any> = {};
    if (range.start !== undefined) params.start = range.start;
    if (range.end !== undefined) params.end = range.end;
    if (range.step) params.step = range.step;
    if (range.time) params.time = range.time;

    return params;
  }

  protected async queryPrometheus<T>(query: string, range?: TimeRange): Promise<T> {
    const formData: Record<string, any> = { query };
    const timeParams = this.buildTimeParams(range);

    Object.assign(formData, timeParams);

    const endpoint = range?.start ? '/api/v1/query_range' : '/api/v1/query';
    const response = await this.client.post(endpoint, null, { params: formData });
    return response.data;
  }
}
