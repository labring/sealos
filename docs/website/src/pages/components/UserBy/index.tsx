import Translate from '@docusaurus/Translate';
import React from 'react';
import CometIcon from '../Comet';
import './index.scss';

const HomeUserBy = ({ isPc }: { isPc: boolean }) => {
  if (!isPc) {
    return (
      <div id="Client" className="home-user-by">
        <div className="comet-icon">
          <CometIcon />
        </div>
        <div className="user-by-title">
          <Translate>Who are Using Sealos</Translate>
        </div>
        {/* 品牌商滚动 */}
        <div className="scroll-brand">
          <div className="img-content">
            <img
              draggable="false"
              src={require('@site/static/illustrations/user-by.png').default}
            />
            <img
              draggable="false"
              src={require('@site/static/illustrations/user-by.png').default}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id="Client" className="home-user-by">
      <div className="comet-icon">
        <CometIcon />
      </div>
      <div className="user-by-title">
        <Translate>Who are Using Sealos</Translate>
      </div>
      {/* 品牌商滚动 */}
      <div className="scroll-brand">
        <div className="img-content">
          <img
            draggable="false"
            src={require('@site/static/illustrations/user-by-2x.png').default}
          />
          <img
            draggable="false"
            src={require('@site/static/illustrations/user-by-2x.png').default}
          />
        </div>
      </div>
    </div>
  );
};

export default React.memo(HomeUserBy);
