import { YamlItemType } from '@/types';
import {
  ProcessedTemplateSourceType,
  TemplateInstanceType,
  TemplateType,
  TemplateSourceType,
  FormSourceInput
} from '@/types/app';
import JsYaml from 'js-yaml';
import { clone, cloneDeep, mapValues } from 'lodash';
import { customAlphabet } from 'nanoid';
import { processEnvValue } from './tools';
import { EnvResponse } from '@/types/index';
import Interpreter from 'js-interpreter';
const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz');
function base64(str: string) {
  return Buffer.from(str).toString('base64');
}

export const generateYamlList = (value: string, labelName: string): YamlItemType[] => {
  try {
    let _value = JsYaml.loadAll(value)
      .filter((i) => i)
      .map((item: any) => JsYaml.dump(processEnvValue(item, labelName)));

    return [
      {
        filename: 'Deploy.yaml',
        value: _value.join('\n---\n')
      }
    ];
  } catch (error) {
    console.log(error, 'generateYamlList');
    return [];
  }
};

export const developGenerateYamlList = (value: string, labelName: string): YamlItemType[] => {
  try {
    return JsYaml.loadAll(value)
      .filter((i) => i)
      .map((item: any) => {
        return {
          filename: `${item?.kind}-${item?.metadata?.name ? item.metadata.name : nanoid(6)}.yaml`,
          value: JsYaml.dump(processEnvValue(item, labelName))
        };
      });
  } catch (error) {
    console.log(error, 'developGenerateYamlList');
    return [];
  }
};

export const parseTemplateString = (
  sourceString: string,
  dataSource: {
    [key: string]: string | Record<string, string>;
  }
): string => {
  sourceString = parseYamlIfEndif(sourceString, dataSource);
  const regex = /\$\{\{\s*(.*?)\s*\}\}/g;

  try {
    const replacedString = sourceString.replace(regex, (match: string, key: string) => {
      const value = evaluateExpression(key, dataSource);
      return value !== undefined ? value : '';
    });
    return replacedString;
  } catch (error) {
    console.log(error, '---parseTemplateString---');
    return '';
  }
};

// need to use parseTemplateVariable first to fill in the variables
export const getTemplateDataSource = (template: TemplateType): ProcessedTemplateSourceType => {
  try {
    if (!template) {
      return {
        defaults: {},
        inputs: []
      };
    }
    const { defaults, inputs } = template.spec;

    // handle default value for inputs
    const handleInputs = (
      inputs: Record<
        string,
        {
          description: string;
          type: string;
          default: string;
          required: boolean;
          options?: string[];
          if?: string;
        }
      >
    ): FormSourceInput[] => {
      if (!inputs || Object.keys(inputs).length === 0) {
        return [];
      }

      const inputsArr = Object.entries(inputs).map(([key, item]) => {
        return {
          ...item,
          description: item.description,
          type: item.type,
          default: item.default,
          required: item.required,
          key: key,
          label: key,
          options: item.options,
          if: item.if
        };
      });
      return inputsArr;
    };

    // // handle input value
    const transformedInput = inputs ? handleInputs(inputs) : [];
    // console.log(cloneDefauls, transformedInput);

    return {
      defaults: defaults || {},
      inputs: transformedInput
    };
  } catch (error) {
    console.log(error, '---getTemplateDataSource---');
    return {
      defaults: {},
      inputs: []
    };
  }
};

export const handleTemplateToInstanceYaml = (
  template: TemplateType,
  instanceName: string
): TemplateInstanceType => {
  const {
    spec: {
      gitRepo,
      templateType,
      template_type,
      categories,
      author,
      title,
      url,
      readme,
      icon,
      description,
      draft,
      defaults,
      inputs
    }
  } = template;

  return {
    apiVersion: 'app.sealos.io/v1',
    kind: 'Instance',
    metadata: {
      name: instanceName
    },
    spec: {
      gitRepo,
      templateType: templateType || template_type,
      categories: categories || [],
      defaults: defaults || {},
      inputs: inputs || {},
      author: author || '',
      title: title || '',
      url: url || '',
      readme: readme || '',
      icon: icon || '',
      description: description || '',
      draft: draft || false
    }
  };
};

// https://github.com/NeilFraser/JS-Interpreter
export function evaluateExpression(
  expression: string,
  data?: {
    [key: string]: any;
  }
): any | undefined {
  try {
    // console.log("expression: ", expression, " data: ", data)
    // const result = new Function('data', `with(data) { return ${expression}; }`)(data);
    const initInterpreterFunc = (interpreter: any, ctx: any) => {
      interpreter.setProperty(ctx, 'data', interpreter.nativeToPseudo(data));
      interpreter.setProperty(ctx, 'random', interpreter.createNativeFunction(nanoid));
      interpreter.setProperty(ctx, 'base64', interpreter.createNativeFunction(base64));
    };
    const interpreter = new Interpreter(`with(data) { ${expression} }`, initInterpreterFunc);
    interpreter.run();
    // console.log('resoult: ', interpreter.value)
    return interpreter.value;
  } catch (error) {
    console.error('Failed to evaluate expression: ', expression, ' data: ', data, error);
    return undefined;
  }
}

export function parseYamlIfEndif(
  yamlStr: string,
  data: {
    [key: string]: string | Record<string, string>;
  }
): string {
  return __parseYamlIfEndif(yamlStr, (exp) => {
    return !!evaluateExpression(exp, data);
  });
}

const yamlIfEndifReg = /^\s*\$\{\{\s*?(if|elif|else|endif)\((.*?)\)\s*?\}\}\s*$/gm;

const __parseYamlIfEndif = (
  yamlStr: string,
  evaluateExpression: (exp: string) => boolean
): string => {
  const stack: RegExpMatchArray[] = [];
  let ifCount = 0;

  const matches = Array.from(yamlStr.matchAll(yamlIfEndifReg));
  if (matches.length === 0) {
    return yamlStr;
  }

  for (const match of matches) {
    const type = match[1];
    if (type === 'if') {
      ifCount++;
    } else if (type === 'endif') {
      ifCount--;
      if (ifCount < 0) {
        throw new Error('endif without matching if');
      }
    }

    if (type === 'if' || type === 'elif' || type === 'else') {
      stack.push(match);
      continue;
    }

    let ifMatch: RegExpMatchArray | undefined;
    let elifElseMatches: RegExpMatchArray[] = [];

    while (stack.length > 0) {
      const temp = stack.pop();
      if (temp && (temp[1] === 'if' || (elifElseMatches.length > 0 && temp[1] === 'else'))) {
        ifMatch = temp;
        break;
      } else if (temp) {
        elifElseMatches.unshift(temp);
      }
    }

    if (!ifMatch) {
      throw new Error('endif without matching if');
    }

    if (stack.length !== 0) {
      continue;
    }

    const start = yamlStr.substring(0, ifMatch.index);
    const end = yamlStr.substring(match.index! + match[0].length);
    let between = '';

    let conditionMet = false;
    if (elifElseMatches.length === 0) {
      const ifResult = evaluateExpression(ifMatch[2]);
      if (ifResult) {
        between = yamlStr.substring(ifMatch.index! + ifMatch[0].length, match.index);
        conditionMet = true;
      }
    } else {
      for (const clause of [ifMatch, ...elifElseMatches]) {
        const expression = clause[2];
        if (clause[1] === 'else' || evaluateExpression(expression)) {
          between = yamlStr.substring(
            clause.index! + clause[0].length,
            clause === elifElseMatches[elifElseMatches.length - 1]
              ? match.index
              : elifElseMatches[elifElseMatches.indexOf(clause) + 1].index
          );
          conditionMet = true;
          break;
        }
      }
    }

    if (!conditionMet && elifElseMatches.length === 0) {
      between = '';
    }

    return __parseYamlIfEndif(start + between + end, evaluateExpression);
  }

  if (ifCount !== 0) {
    throw new Error('Unmatched if statement found');
  }

  return yamlStr;
};

// export function clearYamlIfEndif(yamlStr: string): string {
//   return __parseYamlIfEndif(yamlStr, () => {
//     return false
//   })
// }

export function getYamlSource(str: string, platformEnvs?: EnvResponse): TemplateSourceType {
  let { appYaml, templateYaml } = getYamlTemplate(str);

  templateYaml = parseTemplateVariable(templateYaml, platformEnvs);
  const dataSource = getTemplateDataSource(templateYaml);
  const _instanceName = dataSource?.defaults?.app_name?.value || '';
  const instanceYaml = handleTemplateToInstanceYaml(templateYaml, _instanceName);
  appYaml = `${JsYaml.dump(instanceYaml)}\n---\n${appYaml}`;

  const result: TemplateSourceType = {
    source: {
      ...dataSource,
      ...platformEnvs!
    },
    appYaml,
    templateYaml
  };
  return result;
}

export function getYamlTemplate(str: string): {
  appYaml: string;
  templateYaml: TemplateType;
} {
  const yamlStrList = str.split(/^\s*---\n/m);
  let templateYaml: TemplateType | undefined;
  const appYamlList: string[] = [];

  for (const yamlStr of yamlStrList) {
    if (templateYaml) {
      appYamlList.push(yamlStr);
      continue;
    }
    try {
      templateYaml = JsYaml.load(yamlStr) as TemplateType;
    } catch (error) {
      throw new Error('The first YAML must be a Template and cannot use conditional rendering');
    }
    if (!templateYaml || templateYaml.kind !== 'Template') {
      throw new Error('The first YAML type is not Template');
    }
  }

  if (!templateYaml) {
    throw new Error('No valid Template found in the input YAML string');
  }

  return {
    appYaml: appYamlList.join('---\n'),
    templateYaml: templateYaml
  };
}

export function parseTemplateVariable(
  templateYaml: TemplateType,
  platformEnvs?: EnvResponse
): TemplateType {
  const regex = /\$\{\{\s*(.*?)\s*\}\}/g;

  templateYaml = clone(templateYaml);

  if (templateYaml.spec.defaults) {
    for (let [key, item] of Object.entries(templateYaml.spec.defaults)) {
      if (item.value) {
        item.value =
          item.value.replace(regex, (match: string, key: string) => {
            return evaluateExpression(key, platformEnvs);
          }) || item.value;
      }
    }
  }

  const defaults = templateYaml.spec.defaults
    ? mapValues(templateYaml.spec.defaults, (value) => value.value)
    : {};
  if (templateYaml.spec.inputs) {
    for (let [key, item] of Object.entries(templateYaml.spec.inputs)) {
      if (item.description) {
        item.description =
          item.description.replace(regex, (match: string, key: string) => {
            return evaluateExpression(key, {
              ...platformEnvs,
              defaults
            });
          }) || item.description;
      }
      if (item.default) {
        item.default =
          item.default.replace(regex, (match: string, key: string) => {
            return evaluateExpression(key, {
              ...platformEnvs,
              defaults
            });
          }) || item.default;
      }
    }
  }
  return templateYaml;
}
