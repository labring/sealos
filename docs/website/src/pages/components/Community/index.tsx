import DeveloperIcon from '@site/static/icons/developer.svg'
import DiscordIcon from '@site/static/icons/discord.svg'
import GithubIcon from '@site/static/icons/github.svg'
import React, { useLayoutEffect } from 'react'
import CometIcon from '../Comet'
import Link from '@docusaurus/Link'
import useIsBrowser from '@docusaurus/useIsBrowser'
import './index.scss'
import Translate from '@docusaurus/Translate'

const Community = ({ isPc }: { isPc: boolean }) => {
  const isBrowser = useIsBrowser()

  const I18n_Obj = {
    joinus: <Translate>Join Us</Translate>,
    joinCommunity: <Translate>Join Sealos Community</Translate>,
    joinCommunityIntroduce: (
      <Translate>
        Get early access to the latest Sealos versions and stay connected with developers and users on Discord.
      </Translate>
    ),
  }

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

  const FooterLinks = [
    {
      key: 'GitHub',
      label: <GithubIcon width={20} height={20} />,
      to: 'https://github.com/labring/sealos',
    },
    {
      key: 'Discord Community',
      label: <DiscordIcon width={20} height={20} />,
      to: 'https://discord.com/invite/qzBmGGZGk7',
    },
    {
      key: 'Developer Community',
      label: <DeveloperIcon width={20} height={20} />,
      to: 'https://forum.laf.run/',
    },
  ]

  if (!isPc) {
    return (
      <div className="community">
        <div className="comet-icon">
          <CometIcon />
        </div>
        <div className={'community-title'}>{I18n_Obj.joinus}</div>

        <div className="community-box">
          <div className="join">{I18n_Obj.joinCommunity}</div>
          <span className="text">{I18n_Obj.joinCommunityIntroduce}</span>

          <div className="link">
            {FooterLinks.map((item) => {
              return (
                <Link key={item.key} className="community-logo" to={item.to}>
                  {item.label}
                </Link>
              )
            })}
          </div>
          <img
            draggable="false"
            className="community-phone-logo"
            src={
              require('@site/static/illustrations/community-phone.png').default
            }
            alt="community"
          />
        </div>
      </div>
    )
  }
  return (
    <div className="community">
      <div className="comet-icon">
        <CometIcon />
      </div>
      <div className={'community-title'}>{I18n_Obj.joinus}</div>
      <div className="community-box-wrap">
        <div className="community-box animate__fadeIn" data-wow-duration="1s">
          <div className="community-left">
            <div className="join">{I18n_Obj.joinCommunity}</div>
            <div className="text">{I18n_Obj.joinCommunityIntroduce}</div>
            <div className="link">
              {FooterLinks.map((item) => {
                return (
                  <Link
                    aria-controls={item.key}
                    key={item.key}
                    className="community-logo cell poptip--bottom"
                    to={item.to}>
                    {item.label}
                  </Link>
                )
              })}
            </div>
          </div>
          <img
            draggable="false"
            height={'340px'}
            className="community-right"
            src={require('@site/static/illustrations/community.png').default}
            alt="community"
          />
        </div>
      </div>
    </div>
  )
}

export default React.memo(Community)
