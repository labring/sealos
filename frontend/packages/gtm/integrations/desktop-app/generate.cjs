#!/usr/bin/env node
'use strict';

// Incremental import only: never copy existing production tags into this file.
const fs = require('node:fs');
const path = require('node:path');
const PREFIX = 'Sealos Desktop App | ';
const MEASUREMENT_ID = 'G-YF5VHZSTE0';
const EVENTS = [
  'app_launch', 'app_first_open', 'app_screen_view', 'login_required',
  'login_started', 'login_succeeded', 'login_failed', 'task_created',
  'task_opened', 'deploy_finished', 'visitor_linked'
];
const PROPERTIES = [
  'screen_name', 'outcome', 'reason', 'duration_ms', 'app_version', 'os',
  'arch', 'env', 'packaged', 'flow', 'method', 'service_kind', 'template_id',
  'workspace_id', 'engagement_time_msec'
];

const template = (key, value) => ({ type: 'template', key, value });
const ref = (name) => '{{' + PREFIX + name + '}}';
const variableName = (key) => 'DLV - ' + key;
const dlv = (key) => ref(variableName(key));
const equals = (left, right) => ({ type: 'equals', parameter: [template('arg0', left), template('arg1', right)] });
const table = (entries) => ({
  type: 'list', key: 'eventSettingsTable', list: entries.map(([key, value]) => ({
    type: 'map', map: [template('parameter', key), template('parameterValue', value)]
  }))
});

function generate() {
  const folderId = '800000';
  let variableId = 800100;
  const keys = [
    'app_event_name', 'surface', 'product_edition', 'analytics_consent', 'client_id',
    'user_id', 'session_id', 'event_id', 'detailed', 'visitor_id', 'web_client_id',
    'ga_client_id', 'source.source', 'source.medium', 'source.campaign',
    ...PROPERTIES.map((key) => 'analytics_properties.' + key)
  ];
  const variable = keys.map((key) => ({
    variableId: String(variableId++), name: PREFIX + variableName(key), type: 'v', parentFolderId: folderId,
    parameter: [
      { type: 'integer', key: 'dataLayerVersion', value: '2' },
      { type: 'boolean', key: 'setDefaultValue', value: 'false' },
      template('name', key)
    ]
  }));
  function custom(name, code) {
    variable.push({ variableId: String(variableId++), name: PREFIX + name,
      type: 'jsm', parentFolderId: folderId, parameter: [template('javascript', code)] });
  }
  // Read the real document location. page_location is intentionally a virtual URL
  // in GA4 and must never be used as this security/scope boundary.
  custom('App scope', "function() {\n" +
    "  return location.protocol === 'http:' && location.hostname === '127.0.0.1' &&\n" +
    "    /^\\/desktop-app-analytics\\/[a-f0-9]{32}\\/index\\.html$/.test(location.pathname) &&\n" +
    '    ' + dlv('surface') + " === 'desktop_app' &&\n" +
    '    ' + dlv('product_edition') + " === 'global' &&\n" +
    '    ' + dlv('analytics_consent') + " === 'granted';\n}"
  );
  custom('App event allowed', 'function() {\n  return /^(?:' + EVENTS.join('|') + ')$/.test(' + dlv('app_event_name') + ');\n}');
  custom('Web link scope', "function() {\n" +
    "  var uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;\n" +
    "  return location.protocol === 'https:' &&\n" +
    "    /^(?:[a-z0-9-]+\\.)+sealos\\.io$/.test(location.hostname) && location.hostname !== 'www.sealos.io' &&\n" +
    '    ' + dlv('product_edition') + " === 'global' &&\n" +
    '    ' + dlv('analytics_consent') + " === 'granted' &&\n" +
    '    uuid.test(' + dlv('user_id') + ') && uuid.test(' + dlv('visitor_id') + ');\n}'
  );
  function trigger(id, name, event, guards) {
    return {
      triggerId: id, name: PREFIX + name, type: 'CUSTOM_EVENT', parentFolderId: folderId,
      customEventFilter: [equals('{{_event}}', event)],
      filter: guards.map((guard) => equals(ref(guard), 'true'))
    };
  }
  const triggerList = [
    trigger('800001', 'App init', 'sealos_app_init', ['App scope']),
    trigger('800002', 'App event', 'sealos_app_event', ['App scope', 'App event allowed']),
    trigger('800003', 'Web visitor linked', 'web_visitor_linked', ['Web link scope'])
  ];
  const common = [
    ['visitor_id', dlv('visitor_id')], ['product_edition', dlv('product_edition')],
    ['acquisition_source', dlv('source.source')], ['acquisition_medium', dlv('source.medium')],
    ['acquisition_campaign', dlv('source.campaign')]
  ];
  const appParameters = [
    ...PROPERTIES.map((key) => [key, dlv('analytics_properties.' + key)]),
    ['session_id', dlv('session_id')], ['event_id', dlv('event_id')],
    ['surface', dlv('surface')], ['detailed', dlv('detailed')],
    ['web_client_id', dlv('web_client_id')], ...common
  ];
  function eventTag(id, name, eventName, triggerId, parameters) {
    return {
      tagId: id, name: PREFIX + name, type: 'gaawe', parentFolderId: folderId,
      parameter: [
        { type: 'boolean', key: 'sendEcommerceData', value: 'false' },
        template('eventName', eventName), template('measurementIdOverride', MEASUREMENT_ID),
        table(parameters)
      ], firingTriggerId: [triggerId], tagFiringOption: 'oncePerEvent'
    };
  }
  return {
    exportFormatVersion: 2,
    containerVersion: {
      container: { accountId: '6299222375', containerId: '222308200', name: 'sealos.io',
        publicId: 'GTM-5DTRN2V3', usageContext: ['WEB'] },
      folder: [{ folderId, name: PREFIX + 'Integration v1' }],
      variable, trigger: triggerList,
      tag: [
        {
          tagId: '800010', name: PREFIX + 'App Google tag', type: 'googtag', parentFolderId: folderId,
          parameter: [template('tagId', MEASUREMENT_ID)], firingTriggerId: ['800001'],
          tagFiringOption: 'oncePerLoad'
        },
        eventTag('800011', 'App GA4 event', dlv('app_event_name'), '800002', appParameters),
        eventTag('800012', 'Web visitor linked GA4', 'visitor_linked', '800003', [
          ...common, ['surface', 'desktop_web'], ['web_client_id', dlv('ga_client_id')]
        ])
      ]
    }
  };
}

if (require.main === module) {
  const output = path.resolve(process.argv[2] || path.join(__dirname, 'container.patch.json'));
  fs.writeFileSync(output, JSON.stringify(generate(), null, 2) + '\n');
  process.stdout.write(output + '\n');
}
module.exports = { generate, PREFIX, MEASUREMENT_ID, EVENTS, PROPERTIES };
