import { YamlItemType } from '@/types';
import { ProcessedTemplateSourceType, TemplateInstanceType, TemplateType } from '@/types/app';
import JSYAML from 'js-yaml';
import { cloneDeep, mapValues } from 'lodash';
import { customAlphabet } from 'nanoid';
import { processEnvValue } from './tools';
import { EnvResponse } from '@/types/index';
const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz');

export const generateYamlList = (value: string, labelName: string): YamlItemType[] => {
  try {
    let _value = JSYAML.loadAll(value).map((item: any) =>
      JSYAML.dump(processEnvValue(item, labelName))
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

export const parseTemplateString = (
  sourceString: string,
  regex: RegExp = /\$\{\{\s*(.*?)\s*\}\}/g,
  dataSource: {
    [key: string]: string | Record<string, string>;
    defaults: Record<string, string>;
    inputs: Record<string, string>;
  }
) => {
  // support function list
  const functionHandlers = [
    {
      name: 'base64',
      handler: (value: string) => {
        const regex = /base64\((.*?)\)/;
        const match = value.match(regex);
        if (match) {
          const token = match[1];
          const value = token.split('.').reduce((obj: any, prop: string) => obj[prop], dataSource);
          return Buffer.from(value).toString('base64');
        }
        return value;
      }
    }
  ];

  try {
    const replacedString = sourceString.replace(regex, (match: string, key: string) => {
      if (dataSource[key] && key.indexOf('.') === -1) {
        return dataSource[key];
      }
      if (key.indexOf('.') !== -1) {
        const hasMatchingFunction = functionHandlers.find(({ name }) => key.includes(`${name}(`));
        if (hasMatchingFunction) {
          return hasMatchingFunction.handler(key);
        }
        const value = key.split('.').reduce((obj: any, prop: string) => obj[prop], dataSource);
        return value !== undefined ? value : match;
      }
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
    // support function list
    const functionHandlers = [
      {
        name: 'random',
        handler: (value: string) => {
          const length = value.match(/\${{ random\((\d+)\) }}/)?.[1];
          const randomValue = nanoid(Number(length));
          return value.replace(/\${{ random\(\d+\) }}/, randomValue);
        }
      }
    ];

    // handle default value
    const cloneDefauls = cloneDeep(defaults);
    for (let [key, item] of Object.entries(cloneDefauls)) {
      for (let { name, handler } of functionHandlers) {
        if (item.value && item.value.includes(`\${{ ${name}(`)) {
          item.value = handler(item.value);
          break;
        }
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
        }
      >,
      cloneDefauls: Record<
        string,
        {
          type: string;
          value: string;
        }
      >
    ) => {
      if (!inputs || Object.keys(inputs).length === 0) {
        return [];
      }

      const inputsArr = Object.entries(inputs).map(([key, item]) => {
        for (let { name, handler } of functionHandlers) {
          if (item.default && item.default.includes(`\${{ ${name}(`)) {
            item.default = handler(item.default);
            break;
          }
        }
        const output = mapValues(cloneDefauls, (value) => value.value);
        return {
          ...item,
          description: parseTemplateString(item.description, /\$\{\{\s*(.*?)\s*\}\}/g, {
            ...platformEnvs,
            defaults: output,
            inputs: {}
          }),
          type: item.type,
          default: item.default,
          required: item.required,
          key: key,
          label: key
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

export const developGenerateYamlList = (value: string, labelName: string): YamlItemType[] => {
  try {
    return JSYAML.loadAll(value).map((item: any) => {
      return {
        filename: `${item?.kind}-${item?.metadata?.name ? item.metadata.name : nanoid(6)}.yaml`,
        value: JSYAML.dump(processEnvValue(item, labelName))
      };
    });
  } catch (error) {
    console.log(error);
    return [];
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
