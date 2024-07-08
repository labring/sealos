import React, { useLayoutEffect } from 'react';
import CometIcon from '../Comet';
import RouteIcon from '@site/static/icons/route-icon.svg';
import useIsBrowser from '@docusaurus/useIsBrowser';
import './index.scss';
import Translate from '@docusaurus/Translate';

const Introduce = ({ isPc }: { isPc: boolean }) => {
  const isBrowser = useIsBrowser();

  const i18nObj = {
    whySealos: <Translate>Why Choose Sealos?</Translate>,
    lowerCosts: <Translate>Efficient & Cost-Effective</Translate>,
    lowerCostsIntroduce: (
      <Translate>
        Pay only for the containers you use. Auto-scaling prevents wasted resources, saving you a lot of money.
      </Translate>
    ),
    userFriendly: <Translate>Universal & User-Friendly</Translate>,
    userFriendlyIntroduce: (
      <Translate>
        Focus on your business without worrying about complexity. There is almost no learning curve.
      </Translate>
    ),
    flexibilitySecurity: <Translate>Flexible & Secure</Translate>,
    flexibilitySecurityIntroduce: (
      <Translate>
        The multi-tenant sharing mechanism ensures security while providing resource isolation and efficient collaboration.
      </Translate>
    )
  };

  useLayoutEffect(() => {
    // @ts-ignore nextline
    if (isBrowser && WOW) {
      // @ts-ignore nextline
      new WOW({
        boxClass: 'animate__fadeIn',
        animateClass: 'animate__fadeIn',
        offset: 0,
        mobile: true,
        live: false
      }).init();
    }
  }, [isBrowser]);

  if (!isPc) {
    return (
      <div className="introduce">
        <div className="comet-icon">
          <CometIcon />
        </div>
        <div className="sealos-main-whysealos">{i18nObj.whySealos}</div>
        <div className="features">
          <div className="route">
            <div className="icon1">
              <RouteIcon />
            </div>
            <div className="line1"></div>
            <div className="icon2">
              <RouteIcon />
            </div>
            <div className="line2"></div>
            <div className="icon3">
              <RouteIcon />
            </div>
            <div className="line3"></div>
            <div className="icon4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="19"
                viewBox="0 0 20 19"
                fill="none"
              >
                <circle cx="10.0002" cy="9.51913" r="9.18033" fill="#193246" />
              </svg>
            </div>
          </div>
          <div className="right">
            <div className="tag tag1">{i18nObj.lowerCosts}</div>
            <div className="aid-text">{i18nObj.lowerCostsIntroduce}</div>

            <div className="tag tag2">{i18nObj.userFriendly}</div>
            <div className="aid-text">{i18nObj.userFriendlyIntroduce}</div>

            <div className="tag tag3">{i18nObj.flexibilitySecurity}</div>
            <div className="aid-text">{i18nObj.flexibilitySecurityIntroduce}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="introduce">
      <div className="comet-icon">
        <CometIcon />
      </div>
      <div className="sealos-main-whysealos">{i18nObj.whySealos}</div>
      <div className="features">
        <div className="left animate__fadeIn" data-wow-duration="1s">
          <div className="tag tag1">{i18nObj.lowerCosts}</div>
          <div className="aid-text">{i18nObj.lowerCostsIntroduce}</div>

          <div className="tag tag3">{i18nObj.flexibilitySecurity}</div>
          <div className="aid-text">{i18nObj.flexibilitySecurityIntroduce}</div>
        </div>

        <div className="route">
          <div className="icon1">
            <RouteIcon />
          </div>
          <div className="line1"></div>
          <div className="icon2">
            <RouteIcon />
          </div>
          <div className="line2"></div>
          <div className="icon3">
            <RouteIcon />
          </div>
          <div className="line3"></div>
          <div className="icon4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="19"
              viewBox="0 0 20 19"
              fill="none"
            >
              <circle cx="10.0002" cy="9.51913" r="9.18033" fill="#193246" />
            </svg>
          </div>
        </div>
        <div className="right animate__fadeIn" data-wow-duration="1s">
          <div className="tag tag2">{i18nObj.userFriendly}</div>
          <div className="aid-text">{i18nObj.userFriendlyIntroduce}</div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(Introduce);
