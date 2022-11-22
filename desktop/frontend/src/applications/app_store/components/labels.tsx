import clsx from 'clsx';
import styles from './labels.module.scss';

type TImageLabels = {
  label: string;
  value: string;
  checked: boolean;
};

type TLabels = {
  labels: TImageLabels[];
  appLabels?: string[];
  display: 'column' | 'row' | 'appLabel';
  handleClick: (value: string) => void;
};

function Labels(props: TLabels) {
  const { display, labels, handleClick, appLabels } = props;
  const selectedLabels = labels.slice(1).filter((item) => item.checked === true);

  if (display === 'row') {
    if (selectedLabels.length > 0) {
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
    } else {
      return <div></div>;
    }
  }

  if (display === 'appLabel') {
    return (
      <div className={clsx('flex space-x-4')}>
        {appLabels?.map((item) => {
          return (
            <div key={item} className={clsx('cursor-pointer  px-4 ', styles.appLabels)}>
              <span> {item} </span>
            </div>
          );
        })}
      </div>
    );
  }
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

export default Labels;
