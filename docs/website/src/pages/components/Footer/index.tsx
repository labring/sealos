import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import DeveloperIcon from '@site/static/icons/developer.svg';
import DiscordIcon from '@site/static/icons/discord.svg';
import GithubIcon from '@site/static/icons/github.svg';
import LogoIcon from '@site/static/icons/logo.svg';
import React, { useMemo } from 'react';
import './index.scss';
import Translate from '@docusaurus/Translate';
interface ItemType {
  title: string;
  items: { label: string; to: string }[];
}

const Footer = ({ isPc }: { isPc: boolean }) => {
  const {
    siteConfig: {
      themeConfig: {
        // @ts-ignore nextline
        footer: { links }
      }
    }
  } = useDocusaurusContext();

  const listData = useMemo<ItemType[]>(() => links, []);

  const FooterLinks = [
    {
      key: 'github',
      label: <GithubIcon width={20} height={20} />,
      to: 'https://github.com/labring/sealos'
    },
    {
      key: 'discord',
      label: <DiscordIcon width={20} height={20} />,
      to: 'https://discord.com/invite/qzBmGGZGk7'
    },
    {
      key: 'commit',
      label: <DeveloperIcon width={20} height={20} />,
      to: 'https://forum.laf.run/'
    }
  ];

  if (!isPc) {
    return (
      <div className="home-footer">
        <img
          draggable="false"
          className="footer-img"
          src={require('@site/static/illustrations/footer-mobile.png').default}
          alt="gooter"
        />
        <div className="footer-context">
          <div className="footer-left">
            <div className="footer-main">
              <LogoIcon width={36} height={36} />
              <span className="footer-title">Sealos</span>
            </div>
            <div className="footer-aid-text">
              <Translate>A cloud operating system based on the Kubernetes kernel</Translate>
            </div>
          </div>
          <div className="footer-right">
            {listData.map((listItem) => (
              <div key={listItem.title} className="list-item">
                <h3>{listItem.title}</h3>
                {listItem.items.map((item) => (
                  <span key={item.label}>
                    <Link to={item.to}>{item.label}</Link>
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="footer-bottom-wrap">
          <div className="footer-bottom">
            <div className="footer-bottom-text">
              Made by Sealos Team.{' '}
              <Link to={'https://beian.miit.gov.cn/'}>粤ICP备2023048773号</Link>&nbsp;
              珠海环界云计算有限公司版权所有
            </div>
            <div className="link">
              {FooterLinks.map((item) => {
                return (
                  <Link key={item.key} className="community-logo" to={item.to}>
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="home-footer">
      <img
        draggable="false"
        className="footer-img"
        src={require('@site/static/illustrations/footer.png').default}
        alt="gooter"
      />
      <div className="footer-context">
        <div className="footer-left">
          <div className="footer-main">
            <LogoIcon />
            <span className="footer-title">Sealos</span>
          </div>
          <div className="footer-aid-text">
            <Translate>A cloud operating system based on the Kubernetes kernel</Translate>
          </div>
        </div>
        <div className="footer-right">
          {listData.map((listItem) => (
            <div key={listItem.title} className="list-item">
              <h3>{listItem.title}</h3>
              {listItem.items.map((item) => (
                <span key={item.label}>
                  <Link to={item.to}>{item.label}</Link>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="footer-bottom-wrap">
        <div className="footer-bottom">
          <div className="footer-bottom-text">
            Made by Sealos Team. <Link to={'https://beian.miit.gov.cn/'}>粤ICP备2023048773号</Link>
            &nbsp; 珠海环界云计算有限公司版权所有
          </div>
          <div className="link">
            {FooterLinks.map((item) => {
              return (
                <Link key={item.key} className="community-logo" to={item.to}>
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(Footer);
