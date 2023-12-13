import Translate from '@docusaurus/Translate';
import useIsBrowser from '@docusaurus/useIsBrowser';
import useWindow from '@site/src/hooks/useWindow';
import ApplaunchpadIcon from '@site/static/icons/applaunchpad.svg';
import DataBaseIcon from '@site/static/icons/database.svg';
import ServerlessIcon from '@site/static/icons/serverless.svg';
import React, { useLayoutEffect } from 'react';
import CometIcon from '../Comet';
import './index.scss';

const i18nObj = {
  capability: <Translate>The Capabilities of Sealos</Translate>,
  appMan: <Translate>Application Management</Translate>,
  appManagement_introduce: (
    <Translate>
      Easy management and quick release of publicly accessible distributed applications in the app
      store.
    </Translate>
  ),
  database: <Translate>Database</Translate>,
  database_introduce: (
    <Translate>
      Create high-availability databases in seconds, offering support for MySQL, PostgreSQL,
      MongoDB, and Redis.
    </Translate>
  ),
  serverless: <Translate>Cloud Universality</Translate>,
  serverless_introduce: (
    <Translate>
      Equally effective in both public and private cloud, enabling a seamless transition of
      traditional applications to the cloud.
    </Translate>
  ),
  Explore: <Translate>Explore</Translate>
};

const Capability = ({ isPc }: { isPc: boolean }) => {
  const isBrowser = useIsBrowser();
  const { screenWidth, currentLanguage, cloudUrl, bd_vid } = useWindow();

  useLayoutEffect(() => {
    // @ts-ignore nextline
    if (isBrowser && isPc && WOW) {
      // @ts-ignore nextline
      new WOW({
        boxClass: 'animate__fadeIn',
        animateClass: 'animate__fadeIn',
        offset: 0,
        mobile: false,
        live: false
      }).init();
    }
  }, [isBrowser]);

  if (!isPc) {
    return (
      <div className="capability">
        <div className="comet-icon">
          <CometIcon />
        </div>
        <h2>{i18nObj.capability}</h2>
        <div className="app-management">
          <div className="app-management-text">
            <div className="logo">
              <ApplaunchpadIcon width={20} height={20} />
            </div>
            <h3> {i18nObj.appMan} </h3>
            <h4>{i18nObj.appManagement_introduce}</h4>
            <a
              href={`${cloudUrl}/?bd_vid=${bd_vid}&openapp=system-applaunchpad%3F`}
              target="_black"
            >
              {i18nObj.Explore} {'>'}
            </a>
          </div>
          <img
            draggable="false"
            className="app-management-img"
            src={require('@site/static/illustrations/app-launchpad-detail.png').default}
            alt="app-management"
          />
        </div>

        <div className="application" data-wow-duration="1s">
          <div className="logo">
            <DataBaseIcon />
          </div>
          <div className="application-title">{i18nObj.database} </div>
          <div className="application-text">{i18nObj.database_introduce}</div>
          <a href={`${cloudUrl}/?bd_vid=${bd_vid}&openapp=system-dbprovider%3F`} target="_black">
            {i18nObj.Explore} {'>'}
          </a>
          <img
            draggable="false"
            className="database-img"
            src={require('@site/static/illustrations/capability-dabase.png').default}
            alt="app-management"
          />
        </div>

        <div className="application">
          <div className="logo">
            <ServerlessIcon />
          </div>
          <div className="application-title">{i18nObj.serverless}</div>
          <div className="application-text">{i18nObj.serverless_introduce}</div>
          <a
            className="application-link"
            href={currentLanguage === 'en' ? '/self-hosting ' : '/zh-Hans/self-hosting '}
          >
            {i18nObj.Explore} {'>'}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="capability">
      <div className="comet-icon">
        <CometIcon />
      </div>
      <h2>{i18nObj.capability}</h2>
      <div className="app-management animate__fadeIn" data-wow-duration="1s">
        <div className="app-management-text">
          <div className="logo">
            <ApplaunchpadIcon />
          </div>
          <h3> {i18nObj.appMan} </h3>
          <h4>{i18nObj.appManagement_introduce}</h4>
          <a href={`${cloudUrl}/?bd_vid=${bd_vid}&openapp=system-applaunchpad%3F`} target="_black">
            {i18nObj.Explore} {'>'}
          </a>
        </div>
        <img
          draggable="false"
          className="app-management-img"
          src={require('@site/static/illustrations/app-launchpad-detail.png').default}
          alt="app-management"
        />
      </div>
      <div className="applications" data-wow-duration="1s">
        <div className="application animate__fadeIn" data-wow-duration="1s">
          <div className="logo">
            <DataBaseIcon />
          </div>
          <div className="application-title">{i18nObj.database}</div>
          <div className="application-text">{i18nObj.database_introduce}</div>
          <a href={`${cloudUrl}/?bd_vid=${bd_vid}&openapp=system-dbprovider%3F`} target="_black">
            {i18nObj.Explore} {'>'}
          </a>
          <img
            draggable="false"
            className="database-img"
            src={require('@site/static/illustrations/capability-dabase.png').default}
            alt="app-management"
          />
        </div>
        <div className="application animate__fadeIn" data-wow-duration="1s">
          <div className="logo">
            <ServerlessIcon />
          </div>
          <div className="application-title">{i18nObj.serverless}</div>
          <div className="application-text">{i18nObj.serverless_introduce}</div>
          <a
            className="application-link"
            href={currentLanguage === 'en' ? '/self-hosting ' : '/zh-Hans/self-hosting '}
          >
            {i18nObj.Explore} {'>'}
          </a>
        </div>
      </div>
    </div>
  );
};

export default React.memo(Capability);
