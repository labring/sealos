import { NextRequest, NextResponse } from 'next/server';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { monitorFetch } from '@/services/monitorFetch';
import { MonitorServiceResult } from '@/types/monitor';

export const dynamic = 'force-dynamic';

interface MonitorDataPoint {
  timestamp: number;
  readableTime: string;
  cpu: number;
  memory: number;
}
//time-format
function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}/${month}/${day} ${hours}:${minutes}`;
}
//cpu and memory different formats methods need to be combined.
function mergeMonitorData(
  cpuData: MonitorServiceResult,
  memoryData: MonitorServiceResult
): MonitorDataPoint[] {
  const dataMap = new Map<number, MonitorDataPoint>();

  // Process CPU data
  if (cpuData?.data?.result?.[0]?.values && Array.isArray(cpuData.data.result[0].values)) {
    cpuData.data.result[0].values.forEach(([timestamp, value]) => {
      const cpuUsage = parseFloat((parseFloat(value) * 100).toFixed(2));
      dataMap.set(timestamp, {
        timestamp,
        readableTime: formatTimestamp(timestamp),
        cpu: cpuUsage,
        memory: 0
      });
    });
  }

  // Process Memory data
  if (memoryData?.data?.result?.[0]?.values && Array.isArray(memoryData.data.result[0].values)) {
    memoryData.data.result[0].values.forEach(([timestamp, value]) => {
      const memoryUsage = parseFloat((parseFloat(value) * 100).toFixed(2));
      const existing = dataMap.get(timestamp);
      if (existing) {
        existing.memory = memoryUsage;
      } else {
        dataMap.set(timestamp, {
          timestamp,
          readableTime: formatTimestamp(timestamp),
          cpu: 0,
          memory: memoryUsage
        });
      }
    });
  }

  return Array.from(dataMap.values()).sort((a, b) => a.timestamp - b.timestamp);
}

export async function GET(req: NextRequest, { params }: { params: { name: string } }) {
  try {
    const { name: devboxName } = params;
    const headerList = req.headers;
    const { searchParams } = req.nextUrl;
    const start = searchParams.get('start');
    const end = searchParams.get('end');
    const step = searchParams.get('step') || '2m';

    if (!devboxName) {
      return NextResponse.json([], { status: 400 });
    }

    const kubeconfig = await authSession(headerList);

    const { namespace } = await getK8s({
      kubeconfig: kubeconfig
    });

    const endTime = end ? Number(end) : Date.now();
    const startTime = start ? Number(start) : endTime - 3 * 60 * 60 * 1000;

    const commonParams = {
      launchPadName: devboxName,
      namespace: namespace,
      start: Math.floor(startTime / 1000),
      end: Math.floor(endTime / 1000),
      step: step
    };

    console.log('Monitor request params:', commonParams);

    const [cpuResult, memoryResult] = await Promise.all([
      monitorFetch(
        {
          url: '/query',
          params: {
            ...commonParams,
            type: 'cpu'
          }
        },
        kubeconfig
      ),
      monitorFetch(
        {
          url: '/query',
          params: {
            ...commonParams,
            type: 'memory'
          }
        },
        kubeconfig
      )
    ]);
    const mergedData = mergeMonitorData(
      cpuResult as MonitorServiceResult,
      memoryResult as MonitorServiceResult
    );
    return NextResponse.json(mergedData);
  } catch (error) {
    console.error('Error fetching monitor data:', error);
    return NextResponse.json([]);
  }
}

