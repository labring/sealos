import React, { useLayoutEffect } from 'react'
import CometIcon from '../Comet'
import ApplaunchpadIcon from '@site/static/icons/applaunchpad.svg'
import ServerlessIcon from '@site/static/icons/serverless.svg'
import DataBaseIcon from '@site/static/icons/database.svg'
import useIsBrowser from '@docusaurus/useIsBrowser'
import './index.scss'
import Translate from '@docusaurus/Translate'

const i18nObj = {
  capability: <Translate>The Capabilities of Sealos</Translate>,
  appMan: <Translate>Application Management</Translate>,
  appManagement_introduce: (
    <Translate>
      Rapidly deploy any distributed application with the ability to access the
      public network.
    </Translate>
  ),
  database: <Translate>Database</Translate>,
  database_introduce: (
    <Translate>
      Create highly available databases in seconds that support MySQL,
      PostgreSQL, MongoDB, and Redis.
    </Translate>
  ),
  serverless: <Translate>Serverless</Translate>,
  serverless_introduce: (
    <Translate>
      Serverless computing makes writing code as easy as blogging, allowing you
      to launch and deploy your business code anytime, anywhere.
    </Translate>
  ),
}

const Capability = ({ isPc }: { isPc: boolean }) => {
  const isBrowser = useIsBrowser()

  useLayoutEffect(() => {
    // @ts-ignore nextline
    if (isBrowser && isPc && WOW) {
      // @ts-ignore nextline
      new WOW({
        boxClass: 'animate__fadeIn',
        animateClass: 'animate__fadeIn',
        offset: 0,
        mobile: false,
        live: false,
      }).init()
    }
  }, [isBrowser])

  if (!isPc) {
    return (
      <div className="capability">
        <div className="comet-icon">
          <CometIcon />
        </div>
        <h1>{i18nObj.capability}</h1>
        <div className="app-management">
          <div className="app-management-text">
            <div className="logo">
              <ApplaunchpadIcon width={20} height={20} />
            </div>
            <h3> {i18nObj.appMan} </h3>
            <h4>{i18nObj.appManagement_introduce}</h4>
            <a
              href="https://cloud.sealos.io/?openapp=system-applaunchpad%3F"
              target="_black">
              Explore {'>'}
            </a>
          </div>
          <img
            draggable="false"
            className="app-management-img"
            src={
              require('@site/static/illustrations/app-launchpad-detail.png')
                .default
            }
            alt="app-management"
          />
        </div>

        <div className="application" data-wow-duration="1s">
          <div className="logo">
            <DataBaseIcon />
          </div>
          <div className="application-title">{i18nObj.database} </div>
          <div className="application-text">{i18nObj.database_introduce}</div>
          <a
            href="https://cloud.sealos.io/?openapp=system-dbprovider%3F"
            target="_black">
            Explore {'>'}
          </a>
          <img
            draggable="false"
            className="database-img"
            src={
              require('@site/static/illustrations/capability-dabase.png')
                .default
            }
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
            href="https://github.com/labring/laf"
            target="_black">
            Explore {'>'}
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="capability">
      <div className="comet-icon">
        <CometIcon />
      </div>
      <h1>{i18nObj.capability}</h1>
      <div className="app-management animate__fadeIn" data-wow-duration="1s">
        <div className="app-management-text">
          <div className="logo">
            <ApplaunchpadIcon />
          </div>
          <h3> {i18nObj.appMan} </h3>
          <h4>{i18nObj.appManagement_introduce}</h4>
          <a
            href="https://cloud.sealos.io/?openapp=system-applaunchpad%3F"
            target="_black">
            Explore {'>'}
          </a>
        </div>
        <img
          draggable="false"
          className="app-management-img"
          src={
            require('@site/static/illustrations/app-launchpad-detail.png')
              .default
          }
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
          <a
            href="https://cloud.sealos.io/?openapp=system-dbprovider%3F"
            target="_black">
            Explore {'>'}
          </a>
          <img
            draggable="false"
            className="database-img"
            src={
              require('@site/static/illustrations/capability-dabase.png')
                .default
            }
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
            href="https://github.com/labring/laf"
            target="_black">
            Explore {'>'}
          </a>
        </div>
      </div>
    </div>
  )
}

export default React.memo(Capability)
