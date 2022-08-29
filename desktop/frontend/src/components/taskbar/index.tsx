import Icon from '@/components/icons';
import Battery from '@/components/battery';

import styles from './taskbar.module.scss';
import clsx from 'clsx';

const Taskbar = () => {
  const clickDispatch = (event: any) => {
    var action = {
      type: event.target.dataset.action,
      payload: event.target.dataset.payload
    };

    if (action.type) {
      // dispatch(action);
    }
  };

  return (
    <div className={styles.taskbar}>
      <div className={styles.taskcont}>
        <div className={styles.tasksCont} data-menu="task" data-side={'center'}>
          <div className={styles.tsbar}>
            <Icon
              className={clsx(styles.tsIcon, styles.widget)}
              src="widget"
              width={24}
              click="WIDGTOGG"
            />

            <Icon className={styles.tsIcon} src="home" width={24} click="STARTOGG" />
          </div>
        </div>
        <div className={styles.taskright}>
          <div
            className="px-2 prtclk handcr hvlight flex"
            onClick={clickDispatch}
            data-action="BANDTOGG"
          >
            <Icon width={10} />
          </div>
          <div
            className="prtclk handcr my-1 px-1 hvlight items-center flex rounded"
            onClick={clickDispatch}
            data-action="PANETOGG"
          >
            <Icon className="mr-1" src="wifi" width={16} />
            <Battery />
          </div>

          <div
            className={clsx(styles.taskDate, 'm-1 handcr prtclk rounded hvlight')}
            onClick={clickDispatch}
            data-action="CALNTOGG"
          >
            <div>
              {new Date().toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: 'numeric'
              })}
            </div>
            <div>
              {new Date().toLocaleDateString('en-US', {
                year: '2-digit',
                month: '2-digit',
                day: 'numeric'
              })}
            </div>
          </div>
          <Icon className={clsx(styles.graybd, 'my-4')} width={6} click="SHOWDSK" />
        </div>
      </div>
    </div>
  );
};

export default Taskbar;
