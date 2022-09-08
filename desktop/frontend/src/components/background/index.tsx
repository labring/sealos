import React from 'react';
import styles from './index.module.scss';

export const Background = () => {
  return (
    <div
      className={styles.background}
      style={{
        backgroundImage: `url(https://raw.githubusercontent.com/blueedgetechno/win11React/master/public/img/wallpaper/dark/img0.jpg)`
      }}
    ></div>
  );
};
