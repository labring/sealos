const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function loadTracker(browser = true) {
  const source = readFileSync(
    process.env.GTM_TRACK_SOURCE || join(__dirname, '../src/track.ts'),
    'utf8'
  );
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
  });
  const context = { exports: {}, console };
  if (browser) context.window = { dataLayer: [] };
  vm.runInNewContext(outputText, context);
  return { ...context.exports, window: context.window };
}
const event = (i) => ({ event: 'module_open', module: String(i), context: 'app' });
function receiver(window) {
  const sent = [];
  window.rybbit = { event: (name, properties) => sent.push({ name, ...properties }) };
  return sent;
}

test('GTM-only events are delivered to GTM and never retained for later Rybbit replay', () => {
  const { track, configureGTM, flushRybbitQueue, window } = loadTracker();
  for (let i = 0; i < 200; i++) track(event(i));
  assert.equal(window.dataLayer.length, 200);
  configureGTM({ rybbitEnabled: true });
  const sent = receiver(window);
  flushRybbitQueue();
  assert.equal(sent.length, 0);
  track(event('new'));
  assert.equal(sent[0].module, 'new');
});

test('enabled Rybbit retains only the latest 100 events and flushes in order once', () => {
  const { track, configureGTM, flushRybbitQueue, window } = loadTracker();
  configureGTM({ rybbitEnabled: true });
  for (let i = 0; i < 150; i++) track(event(i));
  const sent = receiver(window);
  flushRybbitQueue();
  flushRybbitQueue();
  assert.equal(sent.length, 100);
  assert.deepEqual(
    sent.map((e) => e.module),
    Array.from({ length: 100 }, (_, i) => String(i + 50))
  );
});

test('SDK readiness flushes older events before a newly tracked event', () => {
  const { track, configureGTM, window } = loadTracker();
  configureGTM({ rybbitEnabled: true });
  track(event('before'));
  const sent = receiver(window);
  track(event('after'));
  assert.deepEqual(
    sent.map((e) => e.module),
    ['before', 'after']
  );
});

for (const setting of [{ rybbitEnabled: false }, { enabled: false }]) {
  test(`disabling ${Object.keys(setting)[0]} drops buffered events and prevents replay`, () => {
    const { track, configureGTM, flushRybbitQueue, window } = loadTracker();
    configureGTM({ rybbitEnabled: true });
    track(event('queued'));
    configureGTM(setting);
    const sent = receiver(window);
    track(event('disabled'));
    flushRybbitQueue();
    assert.equal(sent.length, 0);
    configureGTM({ enabled: true, rybbitEnabled: true });
    track(event('resumed'));
    assert.deepEqual(
      sent.map((e) => e.module),
      ['resumed']
    );
  });
}

test('server-side tracking is safe without window', () => {
  const { track, configureGTM, flushRybbitQueue } = loadTracker(false);
  configureGTM({ rybbitEnabled: true });
  assert.doesNotThrow(() => {
    track(event('ssr'));
    flushRybbitQueue();
  });
});

function mountScript(tracker, props) {
  let setup;
  const source = readFileSync(join(__dirname, '../src/components/RybbitScript.tsx'), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX }
  });
  const context = {
    exports: {},
    console,
    require(name) {
      if (name === 'react')
        return {
          useEffect: (effect) => {
            setup = effect;
          }
        };
      if (name === 'react/jsx-runtime') return { jsx: (type, props) => ({ type, props }) };
      if (name === 'next/script') return { default: 'script' };
      if (name === '../track') return tracker;
      throw new Error(`Unexpected import: ${name}`);
    }
  };
  vm.runInNewContext(outputText, context);
  const element = context.exports.RybbitScript(props);
  return { element, unmount: setup() };
}

test('RybbitScript enables buffering, flushes on load, and disables on unmount', () => {
  const tracker = loadTracker();
  const { element, unmount } = mountScript(tracker, { host: 'https://example.com', siteId: '1' });
  tracker.track(event('loading'));
  const sent = receiver(tracker.window);
  element.props.onLoad();
  assert.deepEqual(
    sent.map((e) => e.module),
    ['loading']
  );
  unmount();
  tracker.track(event('unmounted'));
  assert.equal(sent.length, 1);
});

test('RybbitScript load failure discards the queue', () => {
  const tracker = loadTracker();
  const { element } = mountScript(tracker, { host: 'https://example.com', siteId: '1' });
  tracker.track(event('loading'));
  element.props.onError();
  const sent = receiver(tracker.window);
  tracker.track(event('failed'));
  element.props.onLoad();
  assert.equal(sent.length, 0);
});

test('RybbitScript with missing configuration does not render or buffer', () => {
  const tracker = loadTracker();
  const { element } = mountScript(tracker, { host: '', siteId: '' });
  assert.equal(element, null);
  tracker.track(event('unconfigured'));
  const sent = receiver(tracker.window);
  tracker.configureGTM({ rybbitEnabled: true });
  tracker.flushRybbitQueue();
  assert.equal(sent.length, 0);
  tracker.track(event('enabled'));
  assert.equal(sent.length, 1);
});
