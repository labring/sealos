import { MetricsClient, AuthService } from '../src/index';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../.env') });

async function testAuthCache() {
  console.log('🚀 Starting Authentication Cache Test...\n');

  const kubeconfig = process.env.KUBECONFIG || '';
  if (!kubeconfig) {
    console.error('❌ KUBECONFIG environment variable not set');
    process.exit(1);
  }

  const namespace = process.env.TEST_NAMESPACE || 'default';
  const podName = process.env.TEST_POD_NAME || process.env.TEST_LAUNCHPAD_NAME || '';

  if (!podName) {
    console.error('❌ TEST_POD_NAME or TEST_LAUNCHPAD_NAME environment variable not set');
    process.exit(1);
  }

  try {
    console.log('=== Test 1: Cache Enabled (Default 5 min TTL) ===\n');

    const client = new MetricsClient({
      kubeconfig,
      metricsURL: process.env.METRICS_URL
    });

    console.log('Query 1: First query (should authenticate)...');
    const start1 = Date.now();
    await client.launchpad.query({
      namespace,
      type: 'cpu',
      podName,
      range: {
        start: Math.floor(Date.now() / 1000) - 3600,
        end: Math.floor(Date.now() / 1000),
        step: '1m'
      }
    });
    const time1 = Date.now() - start1;
    console.log(`✅ Query 1 completed in ${time1}ms (with authentication)\n`);

    console.log('Query 2: Same namespace (should use cache)...');
    const start2 = Date.now();
    await client.launchpad.query({
      namespace,
      type: 'memory',
      podName,
      range: {
        start: Math.floor(Date.now() / 1000) - 3600,
        end: Math.floor(Date.now() / 1000),
        step: '1m'
      }
    });
    const time2 = Date.now() - start2;
    console.log(`✅ Query 2 completed in ${time2}ms (cache hit)\n`);

    console.log('Query 3: Same namespace again (should use cache)...');
    const start3 = Date.now();
    await client.launchpad.query({
      namespace,
      type: 'cpu',
      podName,
      range: {
        start: Math.floor(Date.now() / 1000) - 1800,
        end: Math.floor(Date.now() / 1000),
        step: '1m'
      }
    });
    const time3 = Date.now() - start3;
    console.log(`✅ Query 3 completed in ${time3}ms (cache hit)\n`);

    console.log('📊 Performance Summary:');
    console.log(`   First query (auth):  ${time1}ms`);
    console.log(`   Second query (cache): ${time2}ms`);
    console.log(`   Third query (cache):  ${time3}ms`);
    console.log(
      `   Speed improvement: ${Math.round(((time1 - time2) / time1) * 100)}% faster with cache\n`
    );

    console.log('=== Test 2: Cache Disabled (authCacheTTL=0) ===\n');

    const clientNoCache = new MetricsClient({
      kubeconfig,
      metricsURL: process.env.METRICS_URL,
      authCacheTTL: 0
    });

    console.log('Query 1: First query (should authenticate)...');
    const startNoCache1 = Date.now();
    await clientNoCache.launchpad.query({
      namespace,
      type: 'cpu',
      podName,
      range: {
        start: Math.floor(Date.now() / 1000) - 3600,
        end: Math.floor(Date.now() / 1000),
        step: '1m'
      }
    });
    const timeNoCache1 = Date.now() - startNoCache1;
    console.log(`✅ Query 1 completed in ${timeNoCache1}ms (with authentication)\n`);

    console.log('Query 2: Same namespace (should authenticate again)...');
    const startNoCache2 = Date.now();
    await clientNoCache.launchpad.query({
      namespace,
      type: 'memory',
      podName,
      range: {
        start: Math.floor(Date.now() / 1000) - 3600,
        end: Math.floor(Date.now() / 1000),
        step: '1m'
      }
    });
    const timeNoCache2 = Date.now() - startNoCache2;
    console.log(`✅ Query 2 completed in ${timeNoCache2}ms (with authentication)\n`);

    console.log('📊 Performance Comparison (No Cache):');
    console.log(`   First query:  ${timeNoCache1}ms`);
    console.log(`   Second query: ${timeNoCache2}ms`);
    console.log(`   Both queries require full authentication\n`);

    console.log('=== Test 3: Custom TTL (10 seconds) ===\n');

    const clientShortTTL = new MetricsClient({
      kubeconfig,
      metricsURL: process.env.METRICS_URL,
      authCacheTTL: 10000 // 10 seconds
    });

    console.log('Query 1: First query (should authenticate)...');
    await clientShortTTL.launchpad.query({
      namespace,
      type: 'cpu',
      podName,
      range: {
        start: Math.floor(Date.now() / 1000) - 3600,
        end: Math.floor(Date.now() / 1000),
        step: '1m'
      }
    });
    console.log('✅ Query 1 completed\n');

    console.log('Query 2: Immediately after (should use cache)...');
    await clientShortTTL.launchpad.query({
      namespace,
      type: 'memory',
      podName,
      range: {
        start: Math.floor(Date.now() / 1000) - 3600,
        end: Math.floor(Date.now() / 1000),
        step: '1m'
      }
    });
    console.log('✅ Query 2 completed (cache hit)\n');

    console.log('Waiting 11 seconds for cache to expire...');
    await new Promise((resolve) => setTimeout(resolve, 11000));

    console.log('Query 3: After cache expiry (should authenticate again)...');
    const startExpired = Date.now();
    await clientShortTTL.launchpad.query({
      namespace,
      type: 'cpu',
      podName,
      range: {
        start: Math.floor(Date.now() / 1000) - 3600,
        end: Math.floor(Date.now() / 1000),
        step: '1m'
      }
    });
    const timeExpired = Date.now() - startExpired;
    console.log(`✅ Query 3 completed in ${timeExpired}ms (cache expired, re-authenticated)\n`);

    console.log('=== Test 4: In-Flight Dedup (Concurrent Auth) ===\n');

    const authService = new AuthService(kubeconfig, undefined, 10000);
    const authAny = authService as any;
    const { authApi } = authAny.getK8sClient();

    let pingCount = 0;
    const originalPing = authAny.pingReadyz.bind(authAny);
    authAny.pingReadyz = async () => {
      pingCount += 1;
      return originalPing();
    };

    let reviewCount = 0;
    const originalReview = authApi.createSelfSubjectAccessReview.bind(authApi);
    authApi.createSelfSubjectAccessReview = async (...args: any[]) => {
      reviewCount += 1;
      return originalReview(...args);
    };

    const concurrency = 5;
    console.log(`Running ${concurrency} concurrent authenticate calls...`);
    const startConcurrent = Date.now();
    await Promise.all(
      Array.from({ length: concurrency }, () => authService.authenticate(namespace))
    );
    const concurrentTime = Date.now() - startConcurrent;

    console.log(`✅ Concurrent auth completed in ${concurrentTime}ms`);
    console.log(`   pingReadyz calls: ${pingCount}`);
    console.log(`   access review calls: ${reviewCount}\n`);

    if (pingCount !== 1 || reviewCount !== 1) {
      throw new Error(
        `In-flight dedupe failed: pingReadyz=${pingCount}, accessReview=${reviewCount}`
      );
    }

    console.log('🎉 All cache tests passed!');
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testAuthCache();
