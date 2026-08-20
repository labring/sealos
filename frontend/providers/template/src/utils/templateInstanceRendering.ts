import JsYaml from 'js-yaml';

import { generateYamlList, parseTemplateString } from '@/utils/json-yaml';

type TemplateRenderContext = {
  [key: string]: string | Record<string, string>;
};

type K8sResource = {
  apiVersion?: string;
  kind?: string;
  metadata?: {
    name?: string;
    [key: string]: any;
  };
  [key: string]: any;
};

function isTemplateInstanceResource(resource: K8sResource): boolean {
  return resource?.kind === 'Instance' && resource?.apiVersion === 'app.sealos.io/v1';
}

function applyInstanceNameToYamlList(yamlList: string[], instanceName: string): string[] {
  let instanceFound = false;

  const renamedYamlList = yamlList.map((yaml) => {
    const docs = JsYaml.loadAll(yaml)
      .filter((doc): doc is K8sResource => Boolean(doc))
      .map((doc) => {
        if (isTemplateInstanceResource(doc)) {
          instanceFound = true;
          return {
            ...doc,
            metadata: {
              ...doc.metadata,
              name: instanceName
            }
          };
        }
        return doc;
      });

    return docs.map((doc) => JsYaml.dump(doc)).join('---\n');
  });

  if (!instanceFound) {
    throw new Error('Failed to process template: Instance resource not found in template YAML.');
  }

  return renamedYamlList;
}

export function renderTemplateInstanceYamls(input: {
  appYaml: string;
  defaults: Record<string, string>;
  extraLabels?: Record<string, string>;
  inputs: Record<string, string>;
  instanceName: string;
  templateEnvs: TemplateRenderContext;
}): string[] {
  const generateStr = parseTemplateString(input.appYaml, {
    ...input.templateEnvs,
    defaults: input.defaults,
    inputs: input.inputs
  });

  if (!generateStr || generateStr.trim() === '') {
    throw new Error('Failed to generate YAML from template: empty result.');
  }

  const correctYaml = generateYamlList(generateStr, input.instanceName, input.extraLabels);

  if (!correctYaml || correctYaml.length === 0) {
    throw new Error('Failed to generate YAML list from template: no resources generated.');
  }

  const yamls = correctYaml.map((item) => item.value).filter((yaml) => yaml && yaml.trim() !== '');

  if (yamls.length === 0) {
    throw new Error('Failed to generate valid YAML: all resources are empty.');
  }

  return applyInstanceNameToYamlList(yamls, input.instanceName);
}
