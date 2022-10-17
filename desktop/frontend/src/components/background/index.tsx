import React from 'react';
import styles from './index.module.scss';

export const Background = () => {
  return (
    <div
      className={styles.background}
      style={{
        backgroundImage: `url(/background.jpg)`
      }}
    ></div>
  );
};
