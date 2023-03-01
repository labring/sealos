import clsx from 'clsx';
import styles from './drawer.module.scss';

type TDrawer = {
  open: boolean;
  direction: 'left' | 'right' | 'middle';
  children?: any;
  onCancel?: () => void;
};

export default function Drawer(props: TDrawer) {
  const { open, direction, onCancel } = props;

  if (props.direction === 'middle') {
    return (
      <div
        tabIndex={-1}
        className={clsx(open ? styles.drawerWrapper : 'hidden')}
        onClick={onCancel}
      >
        <div
          tabIndex={-1}
          className={clsx(styles.middle, styles.zDrawer)}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={styles.pageWrapperScroll}>
            <section className={clsx(styles.drawerBody, 'absolute w-full')}>
              {open && props.children}
            </section>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div tabIndex={-1} className={clsx(open ? styles.drawerWrapper : 'hidden')} onClick={onCancel}>
      <div tabIndex={-1} className={clsx(styles.drawerContainer)}>
        <div
          tabIndex={-1}
          className={clsx(
            props.direction === 'right' && [styles.right, styles.rightEnter],
            props.direction === 'left' && [styles.left, styles.leftEnter],
            styles.zDrawer,
            open ? styles.drawerEnter : styles.drawerLeave
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={styles.pageWrapperScroll}>
            <section className={clsx(styles.drawerBody, 'absolute w-full')}>
              {open && props.children}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
