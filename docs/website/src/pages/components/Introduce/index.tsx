import React, { useLayoutEffect } from 'react';
import CometIcon from '../Comet';
import RouteIcon from '@site/static/icons/route-icon.svg';
import useIsBrowser from '@docusaurus/useIsBrowser';
import './index.scss';
import Translate from '@docusaurus/Translate';

const Introduce = ({ isPc }: { isPc: boolean }) => {
  const isBrowser = useIsBrowser();

  const i18nObj = {
    whySealos: <Translate>Why Sealos</Translate>,
    lowerCosts: <Translate>Efficient & Economical</Translate>,
    lowerCostsIntroduce: (
      <Translate>
        Pay solely for the containers you utilize; automatic scaling prevents resource squandering
        and substantially reduces costs.
      </Translate>
    ),
    userFriendly: <Translate>User Friendly</Translate>,
    userFriendlyIntroduce: (
      <Translate>
        Concentrate on your core business activities without worrying about system complexities;
        negligible learning costs involved.
      </Translate>
    ),
    flexibilitySecurity: <Translate>Agility & Security</Translate>,
    flexibilitySecurityIntroduce: (
      <Translate>
        The distinctive multi-tenancy sharing model ensures both effective resource segmentation and
        collaboration, all under a secure framework.
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
