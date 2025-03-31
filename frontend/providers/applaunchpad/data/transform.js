/* eslint-disable */

var readFileSync = require('fs').readFileSync;
var writeFileSync = require('fs').writeFileSync;
var yaml = require('js-yaml');
var _ = require('lodash');

const filename =
  process.env.NODE_ENV === 'development' ? './data/config.yaml.local' : '/app/data/config.yaml';
const yamlObj = yaml.load(readFileSync(filename, 'utf-8'));

// Safely select the required attributes
const safeConfig = {
  meta: _.get(yamlObj, ['launchpad', 'meta'], {})
};

const jsonFilename = './data/config.json';
writeFileSync(jsonFilename, JSON.stringify(safeConfig, null, 2));

console.log(`Wrote ${jsonFilename}`);
