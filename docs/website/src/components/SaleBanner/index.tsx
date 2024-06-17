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

  const goDetailFeishu = () => {
    window.open(
      `https://fael3z0zfze.feishu.cn/wiki/SzKowEuQji5coRkm5o8cm8oJn3L?from=from_copylink`,
      '_blank'
    );
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
        <Translate>🎉Sealos 6.18 福利大放送！充值优惠限时开启，多充多送还有精美周边！</Translate>
        <div className="sealos-banner-btn" onClick={goDetailFeishu}>
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
            <div className="banner-title">🎉Sealos 6.18 福利大放送！</div>
            <div className="banner-subtitle">充值优惠限时开启</div>
            <div className="banner-subtitle">多充多送还有精美周边！</div>
            <div
              className="btn"
              onClick={() => {
                window.open(`${cloudUrl}/?openapp=system-costcenter?openRecharge=true`, '_blank');
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
