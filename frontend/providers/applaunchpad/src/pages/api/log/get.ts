import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import { monitorFetch } from '@/services/monitorFetch';
import type { NextApiRequest, NextApiResponse } from 'next';

export interface LogQueryPayload {
  app?: string; // 必填
  time?: string; // 可选，默认 "1h"
  namespace?: string; // 必填
  limit?: string; // 可选，默认 10
  jsonMode?: string; // 可选，默认 "false"
  stderrMode?: string; // 可选，默认 "false"
  numberMode?: string; // 可选，默认 "false"
  numberLevel?: string; // 可选
  pod?: string[]; // 可选，默认 []
  container?: string[]; // 可选，默认 []
  keyword?: string; // 可选，默认 ""
  jsonQuery?: any[]; // 可选，默认 []
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  if (req.method !== 'POST') {
    return jsonRes(res, {
      code: 405,
      error: 'Method not allowed'
    });
  }

  try {
    const kubeconfig = await authSession(req.headers);
    const { namespace } = await getK8s({
      kubeconfig: kubeconfig
    });

    // 检查必填参数
    if (!req.body.app) {
      return jsonRes(res, {
        code: 400,
        error: 'app is required'
      });
    }

    const {
      time = '30d',
      app = '',
      limit = '1',
      jsonMode = 'true',
      stderrMode = 'false',
      numberMode = 'false',
      numberLevel = '',
      pod = [],
      container = [],
      keyword = '',
      jsonQuery = []
    } = req.body as LogQueryPayload;

    const params: LogQueryPayload = {
      time: time,
      // dev
      namespace: 'sealos',
      app: '',
      // ===
      // namespace: namespace,
      // app: app,
      limit: limit,
      jsonMode: jsonMode,
      stderrMode: stderrMode,
      numberMode: numberMode,
      ...(numberLevel && { numberLevel: numberLevel }),
      pod: Array.isArray(pod) ? pod : [],
      container: Array.isArray(container) ? container : [],
      keyword: keyword,
      jsonQuery: Array.isArray(jsonQuery) ? jsonQuery : []
    };

    console.log(params, 'params');

    const result = await fetch('http://192.168.10.63:8428/queryLogsByParams', {
      method: 'POST',
      body: JSON.stringify(params),
      headers: {
        'Content-Type': 'application/json'
        // Authorization: encodeURIComponent(kubeconfig)
      }
    });
    const contentType = result.headers.get('content-type');
    console.log(contentType, 'contentType');
    const data = await result.text();
    // 按行分割并过滤空行
    const logLines = data.split('\n').filter((line) => line.trim());

    // 解析每行日志
    const parsedLogs = logLines.map((line) => {
      try {
        const logEntry = JSON.parse(line);
        // 如果_msg是JSON字符串，也将其解析
        if (logEntry._msg) {
          try {
            logEntry._msg = JSON.parse(logEntry._msg);
          } catch (e) {
            // 如果_msg不是JSON格式，保持原样
          }
        }
        return logEntry;
      } catch (e) {
        return line; // 如果解析失败，返回原始行
      }
    });

    jsonRes(res, {
      code: 200,
      data: parsedLogs
    });
  } catch (error) {
    console.log(error, 'error');

    jsonRes(res, {
      code: 500,
      error: error
    });
  }
}
