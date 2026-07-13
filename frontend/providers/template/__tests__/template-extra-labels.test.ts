import JsYaml from 'js-yaml';
import { describe, expect, it } from 'vitest';
import { templateDeployKey } from '@/constants/keys';
import { validateExtraLabels } from '@/utils/common';
import { generateYamlList, handleTemplateToInstanceYaml } from '@/utils/json-yaml';
import { CreateInstanceRequestSchema } from '@/types/apis/v2alpha/create-instance';
import { DeployTemplateRequestSchema } from '@/types/apis/v2alpha/deploy-template';

const renderedYaml = `apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: demo
  labels:
    app: demo
spec:
  selector:
    matchLabels:
      app: demo
  template:
    metadata:
      labels:
        app: demo
    spec:
      containers:
        - name: main
          image: nginx
          env:
            - name: ENABLED
              value: true
  volumeClaimTemplates:
    - metadata:
        name: data
      spec:
        resources:
          requests:
            storage: 1Gi
---
apiVersion: batch/v1
kind: CronJob
metadata:
  name: cleanup
spec:
  jobTemplate:
    spec:
      template:
        metadata:
          labels:
            job: cleanup
        spec:
          containers:
            - name: cleanup
              image: busybox
          restartPolicy: OnFailure
---
apiVersion: apps.kubeblocks.io/v1alpha1
kind: Cluster
metadata:
  name: postgres
spec:
  componentSpecs:
    - name: postgresql
      volumeClaimTemplates:
        - metadata:
            name: data
          spec:
            resources:
              requests:
                storage: 1Gi
`;

describe('template extraLabels', () => {
  it('injects extra labels into rendered resource metadata, pod templates, and PVC templates', () => {
    const output = generateYamlList(renderedYaml, 'demo', {
      'brain.io/project-id': 'project-uid',
      'brain.io/resource-kind': 'template'
    });

    expect(output).toHaveLength(1);
    const docs = JsYaml.loadAll(output[0].value).filter(Boolean) as any[];
    const statefulSet = docs.find((doc) => doc.kind === 'StatefulSet');
    const cronJob = docs.find((doc) => doc.kind === 'CronJob');
    const cluster = docs.find((doc) => doc.kind === 'Cluster');

    expect(statefulSet.metadata.labels).toMatchObject({
      [templateDeployKey]: 'demo',
      'brain.io/project-id': 'project-uid',
      'brain.io/resource-kind': 'template'
    });
    expect(statefulSet.spec.template.metadata.labels).toMatchObject({
      app: 'demo',
      'brain.io/project-id': 'project-uid',
      'brain.io/resource-kind': 'template'
    });
    expect(statefulSet.spec.volumeClaimTemplates[0].metadata.labels).toMatchObject({
      'brain.io/project-id': 'project-uid',
      'brain.io/resource-kind': 'template'
    });
    expect(cronJob.spec.jobTemplate.spec.template.metadata.labels).toMatchObject({
      job: 'cleanup',
      'brain.io/project-id': 'project-uid'
    });
    expect(cluster.spec.componentSpecs[0].volumeClaimTemplates[0].metadata.labels).toMatchObject({
      'brain.io/project-id': 'project-uid'
    });
  });

  it('keeps Sealos ownership labels reserved', () => {
    const validation = validateExtraLabels({
      [templateDeployKey]: 'other'
    });

    expect(validation.error).toContain(templateDeployKey);
  });

  it('validates Kubernetes label keys and values', () => {
    expect(validateExtraLabels({ 'brain.io/project-id': 'project-uid' }).error).toBeUndefined();
    expect(validateExtraLabels({ 'bad prefix/project-id': 'project-uid' }).error).toContain(
      'valid Kubernetes label key'
    );
    expect(validateExtraLabels({ 'brain.io/project-id': 'has spaces' }).error).toContain(
      'valid Kubernetes label value'
    );
  });

  it('documents extraLabels in v2alpha request schemas', () => {
    expect(
      CreateInstanceRequestSchema.safeParse({
        name: 'demo',
        template: 'n8n',
        extraLabels: { 'brain.io/project-id': 'project-uid' }
      }).success
    ).toBe(true);
    expect(
      DeployTemplateRequestSchema.safeParse({
        yaml: 'apiVersion: app.sealos.io/v1\nkind: Template\nmetadata:\n  name: demo',
        extraLabels: { 'brain.io/project-id': 'project-uid' }
      }).success
    ).toBe(true);
  });

  it('strips UI-only input metadata from generated Instance resources', () => {
    const instance = handleTemplateToInstanceYaml(
      {
        apiVersion: 'app.sealos.io/v1',
        kind: 'Template',
        metadata: {
          name: 'n8n'
        },
        spec: {
          fileName: 'n8n.yaml',
          filePath: 'template/n8n.yaml',
          templateType: 'inline',
          gitRepo: '',
          author: '',
          title: 'n8n',
          url: '',
          readme: '',
          icon: '',
          description: '',
          draft: false,
          inputs: {
            timezone: {
              description: 'Timezone',
              type: 'choice',
              default: 'America/New_York',
              required: true,
              options: ['America/New_York', 'Asia/Shanghai'],
              if: 'true'
            } as any
          }
        }
      },
      'n8n-demo'
    );

    expect(instance.spec.inputs.timezone).toEqual({
      description: 'Timezone',
      type: 'choice',
      default: 'America/New_York',
      required: true
    });
  });
});
