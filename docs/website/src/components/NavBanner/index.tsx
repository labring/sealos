import Translate from '@docusaurus/Translate';
import React, { useEffect, useState } from 'react';
import CloseIcon from '@site/static/icons/close.svg';
import './index.scss';

export default function NavBanner({
  isBannerVisible = false,
  setIsBannerVisible
}: {
  isBannerVisible: boolean;
  setIsBannerVisible: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const closeBanner = () => {
    localStorage.setItem('bannerCloseTimestamp', Date.now().toString());
    setIsBannerVisible(false);
  };

  const goDetail = () => {
    window.open(`https://sealos.run`);
  };

  useEffect(() => {
    const lastCloseTimestamp = +localStorage.getItem('bannerCloseTimestamp');
    if (
      window.location.hostname === 'sealos.io' &&
      (!lastCloseTimestamp || Date.now() - lastCloseTimestamp > 7 * 24 * 60 * 60 * 1000)
    ) {
      setIsBannerVisible(true);
    } else {
      setIsBannerVisible(false);
    }
  }, []);

  return (
    <>
      {isBannerVisible && (
        <div className="sealos-banner-box">
          <Translate>如果您是国内用户，请直接访问 👉 </Translate>
          <div className="sealos-banner-btn" onClick={goDetail}>
            国内官网
          </div>
          <CloseIcon onClick={closeBanner} />
        </div>
      )}
    </>
  );
}
