import clsx from 'clsx';
import produce from 'immer';
import { useEffect, useState } from 'react';
import styles from './labels.module.scss';

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
  const [allActive, setAllActive] = useState(false);
  const [selectedLabels, setSelectedLabels] = useState<TImageLabels[]>([]);

  useEffect(() => {
    const checkedLabels = labels.filter((item) => item.checked === true);
    setSelectedLabels(checkedLabels);
    setAllActive(checkedLabels.length === labels.length);
  }, [labels]);

  const handleClick = (value: string) => {
    if (value === 'All') {
      setLabelsFunction(
        produce((draft: TImageLabels[]) => {
          const isCheckAll = draft.every((item) => item.checked === true);
          draft.forEach((item) => (item.checked = !isCheckAll));
        })
      );
    } else {
      setLabelsFunction(
        produce((draft: TImageLabels[]) => {
          const checkedItem = draft.find((item) => item.value === value);
          if (checkedItem) {
            checkedItem.checked = !checkedItem.checked;
          }
        })
      );
    }
  };

  if (display === 'row' && selectedLabels?.length > 0) {
    return (
      <div className={clsx(styles.xLabels, ' divide-x  mb-4  ')}>
        {selectedLabels.map((item) => {
          return (
            <div
              key={item.label}
              className={clsx('cursor-pointer  px-4 ', { [styles.xActive]: item.checked })}
              onClick={() => handleClick(item.value)}
            >
              <span> {item.value} </span>
              <span>×</span>
            </div>
          );
        })}
      </div>
    );
  }

  if (display === 'column') {
    return (
      <div className="flex flex-col space-y-4">
        <div
          className={clsx(styles.label, { [styles.active]: allActive }, 'cursor-pointer')}
          onClick={() => handleClick('All')}
        >
          All
        </div>
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
