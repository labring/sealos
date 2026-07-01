const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');

function loadAppListState() {
  const sourcePath = path.join(__dirname, 'appListState.ts');
  const source = fs.readFileSync(sourcePath, 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020
    }
  });

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'app-list-state-'));
  const tempFile = path.join(tempDir, 'appListState.cjs');
  fs.writeFileSync(tempFile, compiled.outputText);
  return require(tempFile);
}

const { getAppListContentState, hasAppListTemplates } = loadAppListState();

test('keeps the app list loading before data arrives', () => {
  assert.equal(
    getAppListContentState({
      hasLoadedData: false,
      filteredTemplates: undefined
    }),
    'loading'
  );
});

test('shows the empty state when a loaded catalog has no templates', () => {
  assert.equal(
    getAppListContentState({
      hasLoadedData: true,
      filteredTemplates: []
    }),
    'empty'
  );
});

test('shows the grid when filtered templates are available', () => {
  assert.equal(
    getAppListContentState({
      hasLoadedData: true,
      filteredTemplates: [{}]
    }),
    'grid'
  );
});

test('shows carousel only when the catalog has templates', () => {
  assert.equal(hasAppListTemplates([]), false);
  assert.equal(hasAppListTemplates([{}]), true);
});
