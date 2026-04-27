export const DATAFLOW_APP_KEY = 'system-dataflow';

export const DATAFLOW_SUPPORTED_TYPES = new Set([
  'postgresql',
  'apecloud-mysql',
  'mongodb',
  'redis',
  'clickhouse'
]);

type DataflowEnv = Partial<Record<'DATAFLOW_ENABLED' | 'WHODB_ENABLED', string>>;

export const resolveDataflowEnabled = (env: DataflowEnv = process.env as DataflowEnv) =>
  env.DATAFLOW_ENABLED ?? env.WHODB_ENABLED ?? '';
