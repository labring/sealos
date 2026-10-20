const assert = require('node:assert/strict');

(async () => {
  const cjs = require('@labring/sealos-metrics-sdk');
  const esm = await import('@labring/sealos-metrics-sdk');
  for (const sdk of [cjs, esm]) {
    assert.equal(typeof sdk.MetricsClient, 'function');
    assert.equal(typeof sdk.AuthService, 'function');
    assert.ok(sdk.LAUNCHPAD_QUERIES.gpu);
    assert.ok(sdk.LAUNCHPAD_QUERIES.network_service_request_count);
    assert.ok(new sdk.MetricsClient({ kubeconfig: 'fixture' }).launchpad);
  }
  console.log('CJS and ESM package entry points load successfully');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
