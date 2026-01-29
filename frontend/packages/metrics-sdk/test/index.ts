import { MetricsClient, LaunchpadMetric, DatabaseType, MinioMetric } from '../src/index';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../.env') });

const logResult = (result: unknown) => {
  console.log('   Results:');
  console.dir(result, { depth: null, colors: false });
  console.log('');
};

async function testMetricsSDK() {
  console.log('🚀 Starting Metrics SDK Test...\n');

  const kubeconfig = process.env.KUBECONFIG || '';
  if (!kubeconfig) {
    console.error('❌ KUBECONFIG environment variable not set');
    process.exit(1);
  }

  const namespace = process.env.TEST_NAMESPACE || 'default';
  const podName = process.env.TEST_POD_NAME || process.env.TEST_LAUNCHPAD_NAME || '';
  const dbCluster = process.env.TEST_DB_CLUSTER || '';
  const bucketName = process.env.TEST_BUCKET_NAME || '';

  try {
    const client = new MetricsClient({
      kubeconfig,
      metricsURL: process.env.METRICS_URL
    });
    console.log('✅ MetricsClient initialized\n');

    if (podName) {
      console.log('📊 Testing Launchpad Service...');
      const cpuData = await client.launchpad.query({
        namespace,
        type: LaunchpadMetric.CPU,
        podName,
        range: {
          start: Math.floor(Date.now() / 1000) - 3600,
          end: Math.floor(Date.now() / 1000),
          step: '1m'
        }
      });
      console.log('✅ Launchpad CPU query successful');
      logResult(cpuData.data.result);
    }

    if (dbCluster) {
      console.log('📊 Testing Database Service...');
      const dbData = await client.database.query({
        namespace,
        query: 'cpu',
        type: DatabaseType.PostgreSQL,
        app: dbCluster,
        range: {
          start: Math.floor(Date.now() / 1000) - 3600,
          end: Math.floor(Date.now() / 1000),
          step: '1m'
        }
      });
      console.log('✅ Database CPU query successful');
      logResult(dbData.data.result);
    }

    if (bucketName) {
      console.log('📊 Testing MinIO Service...');
      const minioData = await client.minio.query({
        namespace,
        query: MinioMetric.BucketUsageObjectTotal,
        type: 'minio',
        app: bucketName
      });
      console.log('✅ MinIO query successful');
      logResult(minioData.data.result);
    }

    console.log('🎉 All tests passed!');
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testMetricsSDK();
