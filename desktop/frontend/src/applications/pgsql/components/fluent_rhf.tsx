import { FC } from 'react';
import { Controller } from 'react-hook-form';
import * as React from 'react';
import { Control, RegisterOptions, UseFormSetValue } from 'react-hook-form';
import { SpinButtonField, InputField, Dropdown, Option } from '@fluentui/react-components/unstable';
import { Input, Slider } from '@fluentui/react-components';
import styles from './fluent_rhf.module.scss';
import clsx from 'clsx';

export interface HookFormProps {
  control: Control<any>;
  name: string;
  rules?: RegisterOptions;
  defaultValue?: any;
  setValue?: UseFormSetValue<any>;
  options?: any; //Dropdown
  placeholder?: string;
  contentAfter?: string; //Input
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
        />
      )}
    />
  );
};

export const ControlledDropdown: FC<HookFormProps> = (props) => {
  return (
    <Controller
      name={props.name}
      control={props.control}
      rules={props.rules}
      defaultValue={props.defaultValue || ''}
      render={({ field: { onChange, onBlur, name: fieldName, value }, fieldState: { error } }) => (
        <Dropdown
          className={clsx(styles.dropDownWarp, 'grow')}
          defaultSelectedOptions={[props.defaultValue]}
          onOptionSelect={(e, data) => onChange(data.optionValue)}
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
