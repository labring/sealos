import { NextRequest, NextResponse } from 'next/server';

import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { monitorFetch } from '@/services/monitorFetch';
import { MonitorServiceResult } from '@/types/monitor';

export const dynamic = 'force-dynamic';

interface MonitorDataPoint {
  timestamp: number;
  readableTime: string;
  cpu: number;
  memory: number;
}

const DEVBOX_NAME_PATTERN = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/;
const DEFAULT_RANGE_SECONDS = 3 * 60 * 60;
const DEFAULT_STEP = '2m';

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}/${month}/${day} ${hours}:${minutes}`;
}

function parseTimestamp(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toSeconds(value: number, defaultValue: number): number {
  if (!Number.isFinite(value)) {
    return defaultValue;
  }
  // Guard for millisecond inputs (e.g. Date.now())
  if (Math.abs(value) > 1e12) {
    return Math.floor(value / 1000);
  }
  return Math.floor(value);
}

function collectAveragedSeries(data: MonitorServiceResult | null | undefined): Map<number, number> {
  const bucket = new Map<number, { total: number; count: number }>();

  if (!data?.data?.result) {
    return new Map();
  }

  data.data.result.forEach((series) => {
    const points: Array<[number | string, string]> = Array.isArray(series.values)
      ? series.values
      : series.value
        ? [series.value]
        : [];

    points.forEach(([rawTimestamp, rawValue]) => {
      const timestamp = typeof rawTimestamp === 'string' ? Number(rawTimestamp) : rawTimestamp;
      const value = Number.parseFloat(rawValue);

      if (!Number.isFinite(timestamp) || !Number.isFinite(value)) {
        return;
      }

      const existing = bucket.get(timestamp) ?? { total: 0, count: 0 };
      existing.total += value;
      existing.count += 1;
      bucket.set(timestamp, existing);
    });
  });

  return new Map(
    Array.from(bucket.entries()).map(([timestamp, { total, count }]) => [
      timestamp,
      count > 0 ? total / count : 0
    ])
  );
}

function mergeMonitorSeries(
  cpuData: MonitorServiceResult | null | undefined,
  memoryData: MonitorServiceResult | null | undefined
): MonitorDataPoint[] {
  const cpuSeries = collectAveragedSeries(cpuData);
  const memorySeries = collectAveragedSeries(memoryData);

  const timestamps = new Set<number>([
    ...cpuSeries.keys(),
    ...memorySeries.keys()
  ]);

  return Array.from(timestamps)
    .sort((a, b) => a - b)
    .map((timestamp) => {
      const cpuValue = cpuSeries.get(timestamp) ?? 0;
      const memoryValue = memorySeries.get(timestamp) ?? 0;

      return {
        timestamp,
        readableTime: formatTimestamp(timestamp),
        cpu: Number((cpuValue ).toFixed(2)),
        memory: Number((memoryValue ).toFixed(2))
      };
    });
}

export async function GET(req: NextRequest, { params }: { params: { name: string } }) {
  try {
    const devboxName = params.name;
    const headerList = req.headers;
    const { searchParams } = req.nextUrl;

    if (!devboxName || !DEVBOX_NAME_PATTERN.test(devboxName) || devboxName.length > 63) {
      return jsonRes({
        code: 400,
        message: 'Invalid devbox name format'
      });
    }

    const kubeconfig = await authSession(headerList);
    const { namespace } = await getK8s({
      kubeconfig
    });

    const nowInSeconds = Math.floor(Date.now() / 1000);
    const endParam = parseTimestamp(searchParams.get('end'));
    const startParam = parseTimestamp(searchParams.get('start'));
    const stepParam = searchParams.get('step');

    const endTime = toSeconds(endParam ?? nowInSeconds, nowInSeconds);
    const startTime = toSeconds(
      startParam ?? endTime - DEFAULT_RANGE_SECONDS,
      endTime - DEFAULT_RANGE_SECONDS
    );
    const step = stepParam && stepParam.trim().length > 0 ? stepParam : DEFAULT_STEP;

    if (startTime >= endTime) {
      return jsonRes({
        code: 400,
        message: 'Start timestamp must be earlier than end timestamp'
      });
    }

    const requestParams = {
      launchPadName: devboxName,
      namespace,
      start: startTime,
      end: endTime,
      step
    };
    const [cpuResult, memoryResult] = await Promise.all([
      monitorFetch(
        {
          url: '/query',
          params: {
            ...requestParams,
            type: 'average_cpu'
          }
        },
        kubeconfig
      ),
      monitorFetch(
        {
          url: '/query',
          params: {
            ...requestParams,
            type: 'average_memory'
          }
        },
        kubeconfig
      )
    ]);
    const mergedData = mergeMonitorSeries(
      cpuResult as MonitorServiceResult,
      memoryResult as MonitorServiceResult
    );
    return NextResponse.json(mergedData);
  } catch (err: any) {
    return jsonRes({
      code: 500,
      message: err?.message || 'Failed to fetch devbox monitor data',
      error: err
    });
  }
}
