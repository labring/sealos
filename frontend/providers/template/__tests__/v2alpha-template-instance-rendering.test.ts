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

  it.each([
    { expectedBucket: true, useSealosObjectStorage: 'true' },
    { expectedBucket: false, useSealosObjectStorage: 'false' }
  ])(
    'renders APITable-style top-level conditional documents when object storage is $useSealosObjectStorage',
    ({ expectedBucket, useSealosObjectStorage }) => {
      const appYaml = `apiVersion: app.sealos.io/v1
kind: Instance
metadata:
  name: apitable-default
spec: {}
---
\${{ if(inputs.use_sealos_objectstorage === 'true') }}
apiVersion: objectstorage.sealos.io/v1
kind: ObjectStorageBucket
metadata:
  name: \${{ defaults.app_name }}
spec:
  policy: private
---
\${{ endif() }}
---
apiVersion: v1
kind: Service
metadata:
  name: \${{ defaults.app_name }}
spec:
  ports:
    - port: 80
`;

      expect(() => JsYaml.loadAll(appYaml)).toThrow(/end of the stream/i);

      const [yaml] = renderTemplateInstanceYamls({
        appYaml,
        defaults: {
          app_name: 'apitable-brain'
        },
        inputs: {
          use_sealos_objectstorage: useSealosObjectStorage
        },
        instanceName: 'apitable-brain',
        templateEnvs: {}
      });
      const docs = JsYaml.loadAll(yaml).filter(Boolean) as any[];
      const instance = docs.find((doc) => doc.kind === 'Instance');
      const bucket = docs.find((doc) => doc.kind === 'ObjectStorageBucket');
      const service = docs.find((doc) => doc.kind === 'Service');

      expect(instance?.metadata?.name).toBe('apitable-brain');
      expect(Boolean(bucket)).toBe(expectedBucket);
      if (expectedBucket) {
        expect(bucket?.metadata?.name).toBe('apitable-brain');
      }
      expect(service?.metadata?.name).toBe('apitable-brain');
    }
  );
});
