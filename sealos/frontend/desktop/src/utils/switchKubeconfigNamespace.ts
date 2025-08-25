import * as yaml from 'js-yaml';

export function switchKubeconfigNamespace(kc: string, namespace: string) {
  const oldKc = yaml.load(kc);
  // @ts-ignore
  oldKc.contexts[0].context.namespace = namespace;
  return yaml.dump(oldKc);
}
