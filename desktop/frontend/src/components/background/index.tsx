import React from 'react';
import styles from './index.module.scss';

export const Background = () => {
  return (
    <div
      className={styles.background}
      style={{
        backgroundImage: `url(https://win11.blueedge.me/img/wallpaper/default/img0.jpg)`
      }}
    ></div>
  );
};
