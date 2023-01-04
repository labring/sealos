import clsx from 'clsx';
import styles from './index.module.scss';
import Script from 'next/script';

type TIconfont = {
  iconName: string;
};

function Iconfont(props: TIconfont) {
  const { iconName } = props;

  return (
    <>
      <Script src="//at.alicdn.com/t/c/font_3832498_su260k21s5.js" async></Script>
      <svg className={clsx(styles.icon)} aria-hidden="true">
        <use xlinkHref={`#${iconName}`}></use>
      </svg>
    </>
  );
}

export default Iconfont;
