import { YamlItemType } from '@/types';
import { TemplateType } from '@/types/app';
import JSYAML from 'js-yaml';
import { cloneDeep } from 'lodash';
import { customAlphabet } from 'nanoid';
import { processEnvValue } from './tools';
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
    console.log(error);
    return [];
  }
};

export const parseTemplateString = (
  sourceString: string,
  regex: RegExp = /\$\{\{\s*(.*?)\s*\}\}/g,
  dataSource: any
) => {
  try {
    const replacedString = sourceString.replace(regex, (match: string, key: string) => {
      if (dataSource[key] && key.indexOf('.') === -1) {
        return dataSource[key];
      }
      if (key.indexOf('.') !== -1) {
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

export const getTemplateDataSource = (template: TemplateType) => {
  try {
    if (!template) return;
    const { defaults, inputs } = template.spec;
    // support function list
    const functionHandlers = {
      random: (value: string) => {
        const length = value.match(/\${{ random\((\d+)\) }}/)?.[1];
        const randomValue = nanoid(Number(length));
        return value.replace(/\${{ random\(\d+\) }}/, randomValue);
      }
    };
    // handle default value
    const cloneDefauls = cloneDeep(defaults);
    Object.entries(cloneDefauls).forEach(([key, item]) => {
      Object.entries(functionHandlers).forEach(([handlerKey, handler]) => {
        if (item.value && item.value.includes(`\${{ ${handlerKey}(`)) {
          item.value = handler(item.value);
        }
      });
    });

    // handle default value for inputs
    const handleInputs = (
      inputs: Record<
        string,
        {
          description: string;
          type: string;
          default: string;
          required: boolean;
        }
      >
    ) => {
      Object.entries(inputs).forEach(([key, item]) => {
        Object.entries(functionHandlers).forEach(([handlerKey, handler]) => {
          console.log(handler(item.default), '---');

          if (item.default && item.default.includes(`\${{ ${handlerKey}(`)) {
            item.default = handler(item.default);
          }
        });
      });
      return Object.entries(inputs).map(([key, value]) => {
        return {
          description: value.description,
          type: value.type,
          default: value.default,
          required: value.required,
          key: key,
          label: key.replace('_', ' ')
        };
      });
    };

    // handle input value
    const transformedInput = inputs ? handleInputs(inputs) : {};

    return {
      defaults: cloneDefauls,
      inputs: transformedInput
    };
  } catch (error) {
    console.log(error, '---getTemplateDataSource---');
    return {};
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
