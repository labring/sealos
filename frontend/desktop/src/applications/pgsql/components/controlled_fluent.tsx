import { Dropdown, InputField, Option, SpinButtonField } from '@fluentui/react-components/unstable';
import clsx from 'clsx';
import { FC, useState } from 'react';
import { Control, Controller, RegisterOptions, UseFormSetValue } from 'react-hook-form';
import styles from './controlled_fluent.module.scss';

type TOption = {
  key: string;
  content: string;
};

export interface HookFormProps {
  control: Control<any>;
  name: string;
  rules?: RegisterOptions;
  defaultValue?: any;
  setValue?: UseFormSetValue<any>;
  options?: TOption[]; //Dropdown
  multiselect?: boolean;
  placeholder?: string;
  contentAfter?: string; //Input
  validationMessage?: string;
}

export const ControlledTextField: FC<HookFormProps> = (props) => {
  return (
    <Controller
      name={props.name}
      control={props.control}
      rules={props.rules}
      defaultValue={props.defaultValue || ''}
      render={({ field: { onChange, onBlur, name: fieldName, value }, fieldState: { error } }) => (
        <InputField
          value={value}
          onChange={onChange}
          className={clsx(styles.inputWarp, 'grow')}
          placeholder={props.placeholder}
          validationState={error && 'error'}
          validationMessage={error && props.validationMessage}
          validationMessageIcon={null}
        />
      )}
    />
  );
};

export const ControlledDropdown: FC<HookFormProps> = (props) => {
  const [selectedOptions, setSelectedOptions] = useState<string[]>([props?.defaultValue]);

  return (
    <Controller
      name={props.name}
      control={props.control}
      rules={props.rules}
      defaultValue={props.defaultValue || ''}
      render={({ field: { onChange, onBlur, name: fieldName, value }, fieldState: { error } }) => (
        <Dropdown
          multiselect={props.multiselect}
          className={clsx(styles.dropDownWarp, 'grow', error && styles.errorWarp)}
          selectedOptions={selectedOptions}
          onOptionSelect={(e, data) => {
            setSelectedOptions(data.selectedOptions.filter((res) => res !== undefined));
            onChange(data.selectedOptions.filter((res) => res !== undefined));
          }}
        >
          {props?.options?.map((item: any) => {
            return <Option key={item.key}>{item.content}</Option>;
          })}
        </Dropdown>
      )}
    />
  );
};

export const ControlledNumberField: FC<HookFormProps> = (props) => {
  return (
    <Controller
      name={props.name}
      control={props.control}
      rules={props.rules}
      render={({ field: { onChange, onBlur, name: fieldName, value }, fieldState: { error } }) => (
        <SpinButtonField
          className={clsx(styles.numberWarp, 'grow')}
          defaultValue={props.defaultValue || ''}
          min={1}
          value={value}
          onChange={(e, data) => {
            if (data.value) {
              onChange(data.value);
            } else {
              onChange(data.displayValue);
            }
          }}
        />
      )}
    />
  );
};
