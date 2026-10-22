const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const apps = ['desktop', 'providers/costcenter', 'providers/license'];
function load(app, file, mocks = {}, globals = {}) {
  const filename = path.resolve(__dirname, '..', app, 'src', file);
  const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true
    }
  }).outputText;
  const exports = {};
  vm.runInNewContext(
    output,
    {
      exports,
      require(name) {
        assert.ok(Object.hasOwn(mocks, name), `Unexpected dependency: ${name}`);
        return mocks[name];
      },
      console: { error() {} },
      ...globals
    },
    { filename }
  );
  return exports;
}

for (const app of apps) {
  test(`${app}: health HTTP contract without external dependencies`, async () => {
    let ready = true;
    const route = load(app, 'pages/healthz.ts', {
      '../utils/healthz': {
        HEALTHZ_SERVICE: app.split('/').at(-1),
        assertReady() {
          if (!ready) throw new Error('private configuration detail');
        }
      }
    });
    for (const state of [true, false]) {
      ready = state;
      for (const method of ['GET', 'HEAD', 'POST', 'PUT', 'DELETE']) {
        const headers = {};
        const res = {
          statusCode: 200,
          setHeader(k, v) {
            headers[k] = v;
          },
          end(body) {
            this.body = body;
            this.ended = true;
          }
        };
        await route.getServerSideProps({ req: { method }, res });
        const allowed = method === 'GET' || method === 'HEAD';
        assert.equal(res.statusCode, allowed ? (ready ? 200 : 503) : 405);
        assert.equal(headers['Cache-Control'], 'no-store');
        assert.equal(res.ended, true);
        if (method === 'HEAD') assert.equal(res.body, undefined);
        else {
          assert.equal(headers['Content-Type'], 'application/json');
          assert.doesNotMatch(res.body, /private configuration detail/);
          if (allowed) assert.equal(JSON.parse(res.body).status, ready ? 'ok' : 'error');
        }
        if (!allowed) assert.equal(headers.Allow, 'GET, HEAD');
      }
    }
  });
}

test('desktop: local configuration, malformed/missing fields and path selection', () => {
  const config = {
    cloud: { domain: 'example.test', regionUID: 'test' },
    database: {
      globalCockroachdbURI: 'postgres://unreachable/global',
      regionalCockroachdbURI: 'postgres://unreachable/region'
    },
    desktop: { auth: { jwt: { internal: 'test', regional: 'test', global: 'test' } } }
  };
  for (const env of [
    { NODE_ENV: 'production', CONFIG_PATH: '/ignored' },
    { NODE_ENV: 'development' },
    { NODE_ENV: 'development', CONFIG_PATH: '/custom.yaml' }
  ]) {
    let data = config;
    let missing = false;
    const health = load(
      'desktop',
      'utils/healthz.ts',
      {
        fs: {
          readFileSync(filename) {
            assert.equal(
              filename,
              env.NODE_ENV === 'production'
                ? '/app/data/config.yaml'
                : env.CONFIG_PATH || 'data/config.local.yaml'
            );
            if (missing) throw new Error('ENOENT');
            return JSON.stringify(data);
          }
        },
        'js-yaml': require('../desktop/node_modules/js-yaml')
      },
      { process: { env } }
    );
    health.assertReady();
    for (const invalid of [
      null,
      [],
      {},
      { ...config, cloud: { domain: ' ', regionUID: 'test' } },
      { ...config, database: {} },
      { ...config, desktop: {} }
    ]) {
      data = invalid;
      assert.throws(() => health.assertReady());
    }
    missing = true;
    assert.throws(() => health.assertReady(), /ENOENT/);
  }
});

test('costcenter: readiness follows instrumentation without process.exit', () => {
  assert.throws(
    () => load('providers/costcenter', 'utils/healthz.ts').assertReady(),
    /not initialized/
  );
  load('providers/costcenter', 'utils/healthz.ts', {}, { __APP_CONFIG__: {} }).assertReady();
});

test('license: requires local env but does not connect to MongoDB', () => {
  const env = {
    SEALOS_DOMAIN: 'example.test',
    LICENSE_DOMAIN: 'license.example.test',
    MONGODB_URI: 'mongodb://unreachable'
  };
  const health = load('providers/license', 'utils/healthz.ts', {}, { process: { env } });
  health.assertReady();
  for (const key of Object.keys(env)) {
    const saved = env[key];
    for (const value of ['', '  ', undefined]) {
      env[key] = value;
      assert.throws(() => health.assertReady(), new RegExp(key));
    }
    env[key] = saved;
  }
});
