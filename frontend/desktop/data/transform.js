/* eslint-disable */

var readFileSync = require('fs').readFileSync;
var writeFileSync = require('fs').writeFileSync;
var yaml = require('js-yaml');
var _ = require('lodash');

if (process.env.NODE_ENV === 'development') {
  try {
    readFileSync('./data/config.local.yaml', 'utf-8');
  } catch (e) {
    if (e.code === 'ENOENT') {
      writeFileSync('./data/config.local.yaml', readFileSync('./data/config.yaml', 'utf-8'));
      console.log('Copied ./data/config.yaml to ./data/config.local.yaml');
    } else {
      throw e;
    }
  }
}

let yamlObj;
const filename =
  process.env.NODE_ENV === 'development' ? './data/config.local.yaml' : '/app/data/config.yaml';
try {
  yamlObj = yaml.load(readFileSync(filename, 'utf-8'));
} catch (e) {
  yamlObj = yaml.load(readFileSync('./data/config.local.yaml', 'utf-8'));
}

// Safely select the required attributes
const safeConfig = {
  layout: _.get(yamlObj, ['desktop', 'layout'], {})
};

const jsonFilename = './data/config.json';
writeFileSync(jsonFilename, JSON.stringify(safeConfig, null, 2));
console.log(`Wrote ${jsonFilename}`);
