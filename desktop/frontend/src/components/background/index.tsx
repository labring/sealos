import React from 'react';
import styles from './index.module.scss';

export const Background = () => {
  return (
    <div
      className={styles.background}
      style={{
        backgroundImage: `url(https://images4.alphacoders.com/117/1179686.png)`
      }}
    ></div>
  );
};
