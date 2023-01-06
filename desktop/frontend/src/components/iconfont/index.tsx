import clsx from 'clsx';
import styles from './index.module.scss';

type TIconfont = {
  iconName: string;
};

function Iconfont(props: TIconfont) {
  const { iconName } = props;

  return (
    <>
      <svg className={clsx(styles.icon)} aria-hidden="true">
        <use xlinkHref={`#${iconName}`}></use>
      </svg>
    </>
  );
}

export default Iconfont;
