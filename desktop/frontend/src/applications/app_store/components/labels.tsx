import clsx from 'clsx';
import produce from 'immer';
import { useEffect, useState } from 'react';
import styles from './labels.module.scss';
import Iconfont from 'components/iconfont';

type TImageLabels = {
  label: string;
  value: string;
  checked: boolean;
};

type TLabels = {
  display: 'column' | 'row';
  labels: TImageLabels[];
  setLabelsFunction: Function;
};

function Labels(props: TLabels) {
  const { display, labels, setLabelsFunction } = props;
  const selectedLabels = labels.filter((item) => item.checked);

  const handleClick = (value: string) => {
    setLabelsFunction(
      produce((draft: TImageLabels[]) => {
        const checkedItem = draft.find((item) => item.value === value);
        if (checkedItem) {
          checkedItem.checked = !checkedItem.checked;
        }
      })
    );
  };

  if (display === 'row' && selectedLabels?.length > 0) {
    return (
      <div className={clsx(styles.xLabels, ' divide-x  mb-4  ')}>
        {selectedLabels.map((item) => {
          return (
            <div
              key={item.label}
              className={clsx('cursor-pointer px-4 flex items-center', {
                [styles.xActive]: item.checked
              })}
              onClick={() => handleClick(item.value)}
            >
              <span> {item.value} </span>
              <span className={styles.deleteIcon}>
                <Iconfont iconName="icon-delete" />
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  if (display === 'column') {
    return (
      <div className="flex flex-col space-y-4">
        {labels.map((item) => {
          return (
            <div
              key={item.label}
              className={clsx(styles.label, { [styles.active]: item.checked }, 'cursor-pointer')}
              onClick={() => handleClick(item.value)}
            >
              {item.value}
            </div>
          );
        })}
      </div>
    );
  }

  return null;
}

export default Labels;
