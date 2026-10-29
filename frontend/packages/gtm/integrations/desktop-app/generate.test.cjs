'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { generate, PREFIX, MEASUREMENT_ID, EVENTS } = require('./generate.cjs');
const patch = generate().containerVersion;

function evaluate(name, location, values) {
  const variable = patch.variable.find((item) => item.name === PREFIX + name);
  const source = variable.parameter[0].value.replace(/\{\{Sealos Desktop App \| DLV - (.*?)\}\}/g,
    (_, key) => 'values[' + JSON.stringify(key) + ']');
  return vm.runInNewContext('(' + source + ')()', { location, values });
}
const nativeLocation = { protocol: 'http:', hostname: '127.0.0.1',
  pathname: '/desktop-app-analytics/' + 'a'.repeat(32) + '/index.html' };
const nativeValues = { surface: 'desktop_app', product_edition: 'global', analytics_consent: 'granted' };
const uid = '00000000-0000-4000-8000-000000000001';

test('patch is deterministic, additive, namespaced, and uses only the existing GA4 destination', () => {
  assert.deepEqual(generate(), generate());
  assert.equal(generate().containerVersion.container.publicId, 'GTM-5DTRN2V3');
  for (const kind of ['folder', 'variable', 'trigger', 'tag']) {
    assert.ok(patch[kind].every((entity) => entity.name.startsWith(PREFIX)));
    const id = kind + 'Id';
    assert.equal(new Set(patch[kind].map((item) => item[id])).size, patch[kind].length);
  }
  const ids = new Set(patch.trigger.map((item) => item.triggerId));
  for (const tag of patch.tag) {
    assert.ok(tag.firingTriggerId.every((id) => ids.has(id)));
    assert.equal(tag.parameter.find((p) => ['tagId', 'measurementIdOverride'].includes(p.key)).value, MEASUREMENT_ID);
    assert.notEqual(tag.type, 'html');
  }
  const names = new Set(patch.variable.map((item) => item.name));
  for (const ref of JSON.stringify(patch).matchAll(/\{\{(.*?)\}\}/g)) {
    assert.ok(ref[1] === '_event' || names.has(ref[1]), 'unresolved variable ' + ref[1]);
  }
});

test('native scope requires the actual private loopback analytics path and global consent', () => {
  assert.equal(evaluate('App scope', nativeLocation, nativeValues), true);
  for (const changed of [
    { protocol: 'file:' }, { protocol: 'https:' }, { hostname: 'localhost' },
    { hostname: 'sealos.io' }, { hostname: '127.0.0.1.evil.test' }, { pathname: '/' },
    { pathname: '/desktop-app-analytics/not-a-token/index.html' },
    { pathname: nativeLocation.pathname + '/extra' }
  ]) assert.equal(evaluate('App scope', { ...nativeLocation, ...changed }, nativeValues), false);
  for (const changed of [
    { surface: 'official_website' }, { product_edition: 'china' },
    { analytics_consent: 'denied' }, { analytics_consent: undefined }
  ]) assert.equal(evaluate('App scope', nativeLocation, { ...nativeValues, ...changed }), false);
});

test('native events are an explicit allowlist independent of existing web event rules', () => {
  for (const event of EVENTS) assert.equal(evaluate('App event allowed', nativeLocation, { app_event_name: event }), true);
  for (const event of ['signup', 'purchase', 'sealos_app_event', 'app_launch\n', undefined]) {
    assert.equal(evaluate('App event allowed', nativeLocation, { app_event_name: event }), false);
  }
  const entry = patch.trigger.find((trigger) => trigger.triggerId === '800002');
  assert.equal(entry.filter.length, 2);
});

test('web link requires a trusted global console origin, consent, and valid identity fields', () => {
  const location = { protocol: 'https:', hostname: 'usw-1.sealos.io', pathname: '/oauth2/authorize' };
  const values = { product_edition: 'global', analytics_consent: 'granted', user_id: uid, visitor_id: uid };
  assert.equal(evaluate('Web link scope', location, values), true);
  for (const hostname of ['sealos.io', 'www.sealos.io', 'hzh.sealos.run', 'sealos.io.evil.test', 'evilsealos.io', '127.0.0.1']) {
    assert.equal(evaluate('Web link scope', { ...location, hostname }, values), false);
  }
  assert.equal(evaluate('Web link scope', { ...location, protocol: 'http:' }, values), false);
  for (const changed of [{ product_edition: 'china' }, { analytics_consent: 'denied' }, { user_id: null }, { visitor_id: 'invalid' }]) {
    assert.equal(evaluate('Web link scope', location, { ...values, ...changed }), false);
  }
});

test('mapping stays within 25 event parameters, leaves identity at Google config scope, and preserves browser CID', () => {
  const native = patch.tag.find((tag) => tag.tagId === '800011');
  const web = patch.tag.find((tag) => tag.tagId === '800012');
  for (const tag of [native, web]) {
    const list = tag.parameter.find((p) => p.key === 'eventSettingsTable').list;
    const names = list.map((item) => item.map.find((p) => p.key === 'parameter').value);
    assert.ok(names.length <= 25);
    assert.equal(new Set(names).size, names.length);
    assert.ok(!names.includes('user_id'));
    assert.ok(!names.includes('client_id'));
    assert.ok(!names.includes('gclid'));
    assert.ok(names.includes('acquisition_source'));
  }
  assert.equal(native.parameter.find((p) => p.key === 'eventSettingsTable').list.length, 25);
  const webFields = web.parameter.find((p) => p.key === 'eventSettingsTable').list;
  const cid = webFields.find((item) => item.map[0].value === 'web_client_id');
  assert.equal(cid.map[1].value, '{{' + PREFIX + 'DLV - ga_client_id}}');
});

test('all acquisition source variables read the current v2 object without defaults', () => {
  for (const key of ['source.source', 'source.medium', 'source.campaign']) {
    const variable = patch.variable.find((item) => item.name === PREFIX + 'DLV - ' + key);
    const settings = Object.fromEntries(variable.parameter.map((item) => [item.key, item.value]));
    assert.deepEqual(settings, { dataLayerVersion: '2', setDefaultValue: 'false', name: key });
  }
  // Both producers must clear source before each object push. This test checks
  // the import side never supplies a fallback that could revive absent fields.
  for (const tag of patch.tag.filter((item) => item.type === 'gaawe')) {
    const mapping = tag.parameter.find((item) => item.key === 'eventSettingsTable').list;
    for (const key of ['source', 'medium', 'campaign']) {
      const row = mapping.find((item) => item.map[0].value === 'acquisition_' + key);
      assert.equal(row.map[1].value, '{{' + PREFIX + 'DLV - source.' + key + '}}');
    }
  }
});
