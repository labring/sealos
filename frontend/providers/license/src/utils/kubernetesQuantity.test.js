const assert = require('node:assert/strict');
const test = require('node:test');
const { Decimal } = require('decimal.js');
const { parseKubernetesQuantity } = require('./kubernetesQuantity');

test('parses Kubernetes binary memory quantities', () => {
  assert.equal(
    parseKubernetesQuantity('30265652Ki').dividedBy(Decimal.pow(2, 30)).ceil().toString(),
    '29'
  );
  assert.equal(
    parseKubernetesQuantity('260236Mi').dividedBy(Decimal.pow(2, 30)).ceil().toString(),
    '255'
  );
  assert.equal(
    parseKubernetesQuantity('256Gi').dividedBy(Decimal.pow(2, 30)).ceil().toString(),
    '256'
  );
});

test('parses Kubernetes decimal CPU quantities as cores', () => {
  assert.equal(parseKubernetesQuantity('8').toString(), '8');
  assert.equal(parseKubernetesQuantity('2500m').toString(), '2.5');
});
