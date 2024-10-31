import { NextRequest, NextResponse } from 'next/server';

import { parseJwtToken } from '@/utils/auth';

interface LogInfo {
  token_name: string;
  endpoint: string;
  content: string;
  group: string;
  model: string;
  price: number;
  id: number;
  completion_price: number;
  token_id: number;
  used_amount: number;
  prompt_tokens: number;
  completion_tokens: number;
  channel: number;
  code: number;
  created_at: number;
}

interface SearchResponse {
  data: {
    logs: LogInfo[];
    total: number;
  };
  message: string;
  success: boolean;
}

interface QueryParams {
  token_name?: string;
  model_name?: string;
  code?: string;
  start_timestamp?: string;
  end_timestamp?: string;
  page: number;
  perPage: number;
}

function validateParams(group: string, params: QueryParams): string | null {
  if (!group) {
    return 'Group parameter is required';
  }
  if (params.page < 1) {
    return 'Page number must be greater than 0';
  }
  if (params.perPage < 1 || params.perPage > 100) {
    return 'Per page must be between 1 and 100';
  }
  if (params.start_timestamp && params.end_timestamp) {
    if (parseInt(params.start_timestamp) > parseInt(params.end_timestamp)) {
      return 'Start timestamp cannot be greater than end timestamp';
    }
  }
  return null;
}

async function fetchLogs(
  group: string,
  params: QueryParams
): Promise<{ logs: LogInfo[]; total: number }> {
  try {
    const url = new URL(`/api/logs/${group}/search`, global.AppConfig?.backend.aiproxy);

    // 添加基础分页参数
    url.searchParams.append('p', params.page.toString());
    url.searchParams.append('per_page', params.perPage.toString());

    // 添加可选查询参数
    if (params.token_name) {
      url.searchParams.append('token_name', params.token_name);
    }
    if (params.model_name) {
      url.searchParams.append('model_name', params.model_name);
    }
    if (params.code) {
      url.searchParams.append('code', params.code);
    }
    if (params.start_timestamp) {
      url.searchParams.append('start_timestamp', params.start_timestamp);
    }
    if (params.end_timestamp) {
      url.searchParams.append('end_timestamp', params.end_timestamp);
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: SearchResponse = await response.json();
    if (!result.success) {
      throw new Error(result.message || 'API request failed');
    }

    return {
      logs: result.data.logs,
      total: result.data.total
    };
  } catch (error) {
    console.error('Error fetching logs:', error);
    return {
      logs: [],
      total: 0
    };
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const group = await parseJwtToken(request.headers);
    const searchParams = request.nextUrl.searchParams;

    const queryParams: QueryParams = {
      page: parseInt(searchParams.get('p') || '1', 10),
      perPage: parseInt(searchParams.get('per_page') || '10', 10),
      token_name: searchParams.get('token_name') || undefined,
      model_name: searchParams.get('model_name') || undefined,
      code: searchParams.get('code') || undefined,
      start_timestamp: searchParams.get('start_timestamp') || undefined,
      end_timestamp: searchParams.get('end_timestamp') || undefined
    };

    const validationError = validateParams(group, queryParams);
    if (validationError) {
      return NextResponse.json(
        {
          code: 400,
          message: validationError,
          error: validationError
        },
        { status: 400 }
      );
    }

    const { logs, total } = await fetchLogs(group, queryParams);

    return NextResponse.json({
      code: 200,
      data: {
        logs,
        total
      }
    });
  } catch (error) {
    console.error('Logs search error:', error);
    return NextResponse.json(
      {
        code: 500,
        message: error instanceof Error ? error.message : 'Internal server error',
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    );
  }
}
