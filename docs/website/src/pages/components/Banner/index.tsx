import Translate from '@docusaurus/Translate';
import DrawIcon from '@site/static/icons/draw.svg';
import LogoIcon from '@site/static/icons/sealos.svg';
import React, { useEffect, useState } from 'react';
import './index.scss';

export default function Banner() {
  const [isBannerVisible, setIsBannerVisible] = useState(false);
  const [doMain,setDoMain] = useState('')
  
  const closeBanner = () => {
    setIsBannerVisible(false);
  };

  const goDetailFeishu = () => {
    window.open(`https://fael3z0zfze.feishu.cn/docx/N6C0dl2szoxeX8xtIcAcKSXRn8e`, '_blank');
  };

  useEffect(() => {
    let url = window?.location?.hostname || 'cloud.sealos.io'
    setDoMain(url.indexOf('top') !== -1 ?'cloud.sealos.top':'cloud.sealos.io')
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
        <Translate>🎉 10.24 双十一双节降临！充值优惠限时开启，多充多送还有精美周边！</Translate>
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
            <svg 
              fill='#FFF'
              className='sealos-banner-btn-close'
              onClick={closeBanner}
              xmlns="http://www.w3.org/2000/svg" width="32" height="33" viewBox="0 0 32 33">
              <path d="M16.3536 18.1531L16.0001 17.7995L15.6465 18.1531L9.11318 24.6864C8.97166 24.8279 8.79211 24.9066 8.5334 24.9066C8.27469 24.9066 8.09513 24.8279 7.95362 24.6864C7.8121 24.5449 7.7334 24.3653 7.7334 24.1066C7.7334 23.8479 7.8121 23.6684 7.95362 23.5268L14.487 16.9935L14.8405 16.64L14.487 16.2864L7.95362 9.75307C7.8121 9.61156 7.7334 9.43201 7.7334 9.17329C7.7334 8.91458 7.8121 8.73502 7.95362 8.59351C8.09513 8.452 8.27468 8.37329 8.5334 8.37329C8.79211 8.37329 8.97166 8.452 9.11318 8.59351L15.6465 15.1268L16.0001 15.4804L16.3536 15.1268L22.887 8.59351C23.0285 8.452 23.208 8.37329 23.4667 8.37329C23.7254 8.37329 23.905 8.452 24.0465 8.59351C24.188 8.73503 24.2667 8.91458 24.2667 9.17329C24.2667 9.432 24.188 9.61156 24.0465 9.75307L17.5132 16.2864L17.1596 16.64L17.5132 16.9935L24.0465 23.5268C24.188 23.6684 24.2667 23.8479 24.2667 24.1066C24.2667 24.3653 24.188 24.5449 24.0465 24.6864C23.905 24.8279 23.7254 24.9066 23.4667 24.9066C23.208 24.9066 23.0285 24.8279 22.887 24.6864L16.3536 18.1531Z"/>
            </svg>
          </div>
          <div className="sealos-banner-body">
            <div className="banner-title">🎉 10.24 双十一双节降临！</div>
            <div className="banner-subtitle">充值优惠限时开启</div>
            <div className="banner-subtitle">多充多送还有精美周边！</div>
            <div
              className="btn"
              onClick={() => {
                window.open(
                  `https://${doMain}/?openapp=system-costcenter?openRecharge=true`,
                  '_blank'
                );
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
