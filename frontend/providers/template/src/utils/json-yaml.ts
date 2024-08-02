import { YamlItemType } from '@/types';
import { ProcessedTemplateSourceType, TemplateInstanceType, TemplateType, TemplateSourceType, FormSourceInput } from '@/types/app';
import JsYaml from 'js-yaml';
import { cloneDeep, mapValues } from 'lodash';
import { customAlphabet } from 'nanoid';
import { processEnvValue } from './tools';
import { EnvResponse } from '@/types/index';
import Interpreter from 'js-interpreter';
const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz');

export const generateYamlList = (value: string, labelName: string): YamlItemType[] => {
  try {
    let _value = JsYaml.loadAll(value).filter((i) => i).map((item: any) =>
      JsYaml.dump(processEnvValue(item, labelName))
    );

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
    return JsYaml.loadAll(value).filter((i) => i).map((item: any) => {
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
  sourceString = parseYamlIfEndif(sourceString, dataSource)
  const regex = /\$\{\{\s*(.*?)\s*\}\}/g

  try {
    const replacedString = sourceString.replace(regex, (match: string, key: string) => {
      return evaluateExpression(key, dataSource);
    });
    return replacedString;
  } catch (error) {
    console.log(error, '---parseTemplateString---');
    return '';
  }
};

export const getTemplateDataSource = (
  template: TemplateType,
  platformEnvs?: EnvResponse
): ProcessedTemplateSourceType => {
  try {
    if (!template) {
      return {
        defaults: {},
        inputs: []
      };
    }
    const { defaults, inputs } = template.spec;
    const regex = /\$\{\{\s*(.*?)\s*\}\}/g

    // handle default value
    const cloneDefauls = cloneDeep(defaults);
    for (let [key, item] of Object.entries(cloneDefauls)) {
      if (item.value) {
        item.value = item.value.replace(regex, (match: string, key: string) => {
          return evaluateExpression(key, platformEnvs);
        }) || item.value;
      }
    }

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
          show?: string;
        }
      >,
      cloneDefauls: Record<
        string,
        {
          type: string;
          value: string;
        }
      >
    ): FormSourceInput[] => {
      if (!inputs || Object.keys(inputs).length === 0) {
        return [];
      }

      const inputsArr = Object.entries(inputs).map(([key, item]) => {
        const output = mapValues(cloneDefauls, (value) => value.value);
        if (item.default) {
          item.default = item.default.replace(regex, (match: string, key: string) => {
            return evaluateExpression(key, {
              ...platformEnvs,
              defaults: output,
            });
          }) || item.default;
        }
        return {
          ...item,
          description: parseTemplateString(item.description, {
            ...platformEnvs,
            defaults: output,
            inputs: {}
          }),
          type: item.type,
          default: item.default,
          required: item.required,
          key: key,
          label: key,
          options: item.options,
          show: item.show
        };
      });
      return inputsArr;
    };

    // // handle input value
    const cloneInputs = cloneDeep(inputs);
    const transformedInput = handleInputs(cloneInputs, cloneDefauls);
    // console.log(cloneDefauls, transformedInput);

    return {
      defaults: cloneDefauls,
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
    spec: { gitRepo, templateType, template_type, categories, ...resetSpec }
  } = template;

  return {
    apiVersion: 'app.sealos.io/v1',
    kind: 'Instance',
    metadata: {
      name: instanceName
    },
    spec: {
      gitRepo: gitRepo,
      templateType: templateType || template_type,
      categories: categories || [],
      ...resetSpec
    }
  };
};

// https://github.com/NeilFraser/JS-Interpreter
export function evaluateExpression(expression: string, data?: {
  [key: string]: any;
}): any | undefined {
  try {
    // console.log(`expression: ${expression}\ndata: `, data)
    // const result = new Function('data', `with(data) { return ${expression}; }`)(data);
    const initInterpreterFunc = (interpreter: any, ctx: any) => {
      interpreter.setProperty(ctx, 'data', interpreter.nativeToPseudo(data));
      interpreter.setProperty(ctx, 'random', interpreter.nativeToPseudo(nanoid));
      function base64(str: string) {
        return Buffer.from(str).toString('base64');
      }
      interpreter.setProperty(ctx, 'base64', interpreter.nativeToPseudo(base64));
    }
    const interpreter = new Interpreter(` with(data) { ${expression} } `, initInterpreterFunc)
    interpreter.run();
    // console.log('resoult: ', interpreter.value)
    return interpreter.value;
  } catch (error) {
    console.error(`Failed to evaluate expression: ${expression}`, error, "data: ", data);
    return undefined;
  }
};

export function parseYamlIfEndif(yamlStr: string, data: {
  [key: string]: string | Record<string, string>;
}): string {
  return __parseYamlIfEndif(yamlStr, (exp) => {
    return !!evaluateExpression(exp, data)
  })
}

const yamlIfEndifReg = /^\s*\$\{\{\s*?(if|elif|else|endif)\((.*?)\)\s*?\}\}\s*$/gm;

const __parseYamlIfEndif = (yamlStr: string, evaluateExpression: (exp: string) => boolean): string => {
  const stack: RegExpMatchArray[] = [];

  const Matchs = Array.from(yamlStr.matchAll(yamlIfEndifReg));
  if (Matchs.length === 0) {
    return yamlStr;
  }

  for (const Match of Matchs) {
    const Type = Match[1];
    if (Type === 'if' || Type === 'elif' || Type === 'else') {
      stack.push(Match);
      continue;
    }
    let If: RegExpMatchArray | undefined;
    let ElifElse: RegExpMatchArray[] = [];

    while (stack.length > 0) {
      const temp = stack.pop();
      if (temp && (temp[1] === 'if' || (ElifElse.length > 0 && temp[1] === 'else'))) {
        If = temp;
        break;
      } else if (temp) {
        ElifElse.unshift(temp);
      }
    }

    if (!If) {
      throw new Error('endif without if');
    }

    if (stack.length !== 0) {
      continue;
    }

    const start = yamlStr.substring(0, If.index);
    const end = yamlStr.substring(Match.index! + Match[0].length);
    let between = '';

    if (ElifElse.length === 0) {
      const IfResult = evaluateExpression(If[2]);
      if (IfResult) {
        between = yamlStr.substring(If.index! + If[0].length, Match.index);
      }
    } else {
      let conditionMet = false;
      for (const clause of [If, ...ElifElse]) {
        const expression = clause[2];
        if (clause[1] === 'else' || evaluateExpression(expression)) {
          between = yamlStr.substring(clause.index! + clause[0].length, clause === ElifElse[ElifElse.length - 1] ? Match.index : ElifElse[ElifElse.indexOf(clause) + 1].index);
          conditionMet = true;
          break;
        }
      }

      if (!conditionMet) {
        between = yamlStr.substring(ElifElse[ElifElse.length - 1].index! + ElifElse[ElifElse.length - 1][0].length, Match.index);
      }
    }

    return __parseYamlIfEndif(start + between + end, evaluateExpression);
  }

  return yamlStr;
};

export function clearYamlIfEndif(yamlStr: string): string {
  return __parseYamlIfEndif(yamlStr, () => {
    return false
  })
}

export function getYamlSource(str: string, platformEnvs?: EnvResponse): TemplateSourceType {
  const { yamlList, templateYaml } = getYamlTemplate(str)

  const dataSource = getTemplateDataSource(templateYaml, platformEnvs);
  const _instanceName = dataSource?.defaults?.app_name?.value || '';
  const instanceYaml = handleTemplateToInstanceYaml(templateYaml, _instanceName);
  yamlList.unshift(JsYaml.dump(instanceYaml));

  const result: TemplateSourceType = {
    source: {
      ...dataSource,
      ...platformEnvs!
    },
    yamlList: yamlList,
    templateYaml: templateYaml
  };
  return result;
}

export function getYamlTemplate(str: string): {
  yamlList: string[];
  templateYaml: TemplateType;
} {
  const yamlStrList = str.split('---\n');
  let templateYaml: TemplateType | undefined;
  const otherYamlList: string[] = [];

  for (const yamlStr of yamlStrList) {
    try {
      if (!templateYaml) {
        const yamlObj = JsYaml.load(clearYamlIfEndif(yamlStr)) as TemplateType;
        if (yamlObj && yamlObj.kind === 'Template') {
          templateYaml = yamlObj;
          continue
        }
      }
      otherYamlList.push(yamlStr);
    } catch (error) {
      throw new Error('yaml parse error: ' + error);
    }
  }

  return {
    yamlList: otherYamlList,
    templateYaml: templateYaml as TemplateType
  };
}