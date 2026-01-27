import axios, { AxiosInstance } from 'axios';
import { URLSearchParams } from 'url';
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
        if (error?.response) {
          const status = error.response.status;
          const data = error.response.data;
          if (typeof data === 'string' && data.trim()) {
            throw new Error(data);
          }
          const detail = data ? JSON.stringify(data) : error.message;
          throw new Error(`Metrics API request failed: ${status} ${detail}`);
        }
        throw new Error(`Metrics API request failed: ${error.message}`);
      }
    );
  }

  protected buildTimeParams(range?: TimeRange): Record<string, any> {
    if (!range) return {};

    const params: Record<string, any> = {};
    const hasStart = range.start !== undefined && range.start !== null && range.start !== '';
    if (hasStart) {
      params.start = range.start;
      if (range.end !== undefined) params.end = range.end;
      if (range.step) params.step = range.step;
    } else if (range.time) {
      params.time = range.time;
    }

    return params;
  }

  protected injectNamespaceLegacy(query: string, namespace: string): string {
    const nsMatcher = `namespace=~"${namespace}"`;
    let result = query.replace(/\$/g, nsMatcher);
    result = result.replace(/{/g, `{${nsMatcher},`);
    return result;
  }

  protected resolveNamespace(namespace?: string): string {
    return this.authService.resolveNamespace(namespace);
  }

  protected async queryPrometheus<T>(query: string, range?: TimeRange): Promise<T> {
    const formData: Record<string, any> = { query };
    const timeParams = this.buildTimeParams(range);

    Object.assign(formData, timeParams);

    const hasStart = range?.start !== undefined && range?.start !== null && range?.start !== '';
    const endpoint = hasStart ? '/api/v1/query_range' : '/api/v1/query';

    console.log('🔍 Debug Info:');
    console.log('  Query:', query);
    console.log('  Endpoint:', this.baseURL + endpoint);
    console.log('  Params:', formData);

    const body = new URLSearchParams(
      Object.entries(formData).reduce<Record<string, string>>((acc, [key, value]) => {
        acc[key] = String(value);
        return acc;
      }, {})
    ).toString();
    const response = await this.client.post(endpoint, body);

    console.log('  Response status:', response.data.status);
    console.log('  Result count:', response.data.data?.result?.length || 0);
    if (response.data.data?.result?.length === 0) {
      console.log('  ⚠️  Empty result!');
    }
    console.log('');

    return response.data;
  }
}
