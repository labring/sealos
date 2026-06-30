import JsYaml from 'js-yaml';
import { describe, expect, it } from 'vitest';

import { renderTemplateInstanceYamls } from '@/utils/templateInstanceRendering';

describe('v2alpha template instance rendering', () => {
  it('renders conditional template YAML before parsing and renames the Instance', () => {
    const appYaml = `apiVersion: app.sealos.io/v1
kind: Instance
metadata:
  name: fastgpt-default
spec: {}
---
apiVersion: v1
kind: Service
metadata:
  name: \${{ defaults.app_name }}
spec:
  ports:
    - port: 80
    \${{ if(inputs.agent_sandbox_baseurl) }}
    - port: 3000
      name: sandbox
    \${{ endif() }}
`;

    expect(() => JsYaml.loadAll(appYaml)).toThrow(/bad indentation|end of the stream/i);

    const [yaml] = renderTemplateInstanceYamls({
      appYaml,
      defaults: {
        app_name: 'fastgpt-brain'
      },
      extraLabels: {
        'brain.io/managed-by': 'deployment-task'
      },
      inputs: {
        agent_sandbox_baseurl: 'https://sandbox.example.com'
      },
      instanceName: 'fastgpt-brain',
      templateEnvs: {}
    });
    const docs = JsYaml.loadAll(yaml).filter(Boolean) as any[];

    expect(docs[0]).toMatchObject({
      apiVersion: 'app.sealos.io/v1',
      kind: 'Instance',
      metadata: {
        name: 'fastgpt-brain',
        labels: {
          'brain.io/managed-by': 'deployment-task'
        }
      }
    });
    expect(docs[1]).toMatchObject({
      kind: 'Service',
      metadata: {
        name: 'fastgpt-brain'
      },
      spec: {
        ports: [
          { port: 80 },
          {
            name: 'sandbox',
            port: 3000
          }
        ]
      }
    });
  });
});
