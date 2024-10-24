import Translate from '@docusaurus/Translate';
import DrawIcon from '@site/static/icons/draw.svg';
import LogoIcon from '@site/static/icons/sealos.svg';
import React, { useEffect, useState } from 'react';
import './index.scss';
import useWindow from '@site/src/hooks/useWindow';

export default function SaleBanner() {
  const [isBannerVisible, setIsBannerVisible] = useState(false);
  const { cloudUrl } = useWindow();

  const closeBanner = () => {
    setIsBannerVisible(false);
  };

  const goDetail = () => {
    window.open(`https://mp.weixin.qq.com/s/jzOfviMgXD85r2zMQWskvA`, '_blank');
  };

  useEffect(() => {
    // Get the last display timestamp from localStorage
    const lastDisplayTimestamp = localStorage.getItem('bannerLastDisplay');
    const today = new Date().toLocaleDateString();

    // Check if the banner has not been displayed today
    if (!lastDisplayTimestamp || lastDisplayTimestamp !== today) {
      setIsBannerVisible(true);
      // Store the current date in localStorage
      localStorage.setItem('bannerLastDisplay', today);
    }
  }, []);

  return (
    <>
      <div className="sealos-banner-box">
        <Translate>🎉 1024 程序员节福利 Sealos 免费送你云资源</Translate>
        <div className="sealos-banner-btn" onClick={goDetail}>
          活动详情
          <DrawIcon />
        </div>
      </div>
      {isBannerVisible && <div className="sealos-banner-modal"></div>}
      {isBannerVisible && (
        <div className="sealos-banner-container">
          <div className="title">
            <LogoIcon width={'42px'} height={'42px'} />
            <span className="txt">Sealos</span>
          </div>
          <div className="sealos-banner-body">
            <div className="banner-title">🎉 Sealos 免费送你云资源</div>
            <div className="banner-subtitle">1024 充值优惠限时开启</div>
            <div className="banner-subtitle">体验Devbox，即送20余额</div>
            <div
              className="btn"
              onClick={() => {
                window.open(`${cloudUrl}/?openapp=system-devbox?openRecharge=true`, '_blank');
                closeBanner();
              }}
            >
              立即参加
            </div>
            <div className="btn-cancel" onClick={closeBanner}>
              我再想想
            </div>
          </div>
        </div>
      )}
    </>
  );
}
