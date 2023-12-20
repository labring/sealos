import Link from '@docusaurus/Link';
import Translate from '@docusaurus/Translate';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import useIsBrowser from '@docusaurus/useIsBrowser';
import useWindow from '@site/src/hooks/useWindow';
import GithubIcon from '@site/static/icons/github.svg';
import MeunIcon from '@site/static/icons/meun.svg';
import LogoIcon from '@site/static/icons/sealos.svg';
import React, { useEffect, useState } from 'react';
import './index.scss';

const navbar = [
  {
    key: 'docs',
    label: <Translate>Documentation</Translate>,
    to: '/docs/Intro'
  },
  {
    key: 'community',
    label: <Translate>Community</Translate>,
    to: 'https://forum.laf.run/'
  },
  {
    key: 'hosting',
    label: <Translate>Hosting</Translate>,
    to: '/self-hosting'
  },
  {
    key: 'blog',
    label: <Translate>Blog</Translate>,
    to: '/blog'
  },
  {
    key: 'contact',
    label: <Translate>Contact</Translate>,
    to: 'https://fael3z0zfze.feishu.cn/share/base/form/shrcnesSfEK65JZaAf2W6Fwz6Ad'
  }
];

const i18nObj = {
  startNow: <Translate>Start Now</Translate>,
  cloudOS: <Translate>Cloud Operating System</Translate>
};

const HomeHeader = ({ isPc }: { isPc: boolean }) => {
  const [stars, setStars] = useState(10000);
  const isBrowser = useIsBrowser();
  const { cloudUrl, bd_vid } = useWindow();

  const {
    i18n: { currentLocale, defaultLocale }
  } = useDocusaurusContext();

  const i18nMap: { [key: string]: { label: string; link: string } } =
    defaultLocale === 'en'
      ? {
          en: { label: '中', link: '/zh-Hans/' },
          ['zh-Hans']: { label: 'En', link: '/' }
        }
      : {
          en: { label: '中', link: '/' },
          ['zh-Hans']: { label: 'En', link: '/en/' }
        };

  useEffect(() => {
    const getStars = async () => {
      try {
        const { stargazers_count } = await (
          await fetch('https://api.github.com/repos/labring/sealos')
        ).json();
        setStars(isNaN(stargazers_count) ? 11 * 1000 : stargazers_count);
      } catch (error) {}
    };
    getStars();
  }, []);

  const openSideBar = () => {
    const NavbarButton: HTMLBaseElement = document.querySelector('.navbar__toggle');
    const event = new MouseEvent('click', {
      view: window,
      bubbles: true,
      cancelable: true
    });
    NavbarButton.dispatchEvent(event);
  };

  if (!isPc) {
    return (
      <div className="sealo_price_header">
        <nav>
          <div className="left">
            <MeunIcon width={'24px'} height={'24px'} onClick={() => openSideBar()} />
            <LogoIcon width={'42px'} height={'42px'} />
            <span className="sealos-title">Sealos</span>
          </div>
          <div className="right">
            <Link className="git-icon" to="https://github.com/labring/sealos">
              <GithubIcon width={'20px'} height={'20px'} color="#fff" />
              <span className="git-stars">{Math.floor(stars / 1000)}k</span>
            </Link>
          </div>
        </nav>
      </div>
    );
  }

  return (
    <div className="sealo_price_header">
      <nav>
        <div className="left">
          <div
            className="sealos_home_header_title"
            onClick={() =>
              window.location.replace(
                `${location.origin}${currentLocale === defaultLocale ? '/' : `/${currentLocale}/`}`
              )
            }
          >
            <LogoIcon width={'42px'} height={'42px'} />
            <span className="sealos-title">Sealos</span>
          </div>
          <div className="links">
            {navbar.map((item) => (
              <Link key={item.key} to={item.to}>
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="right">
          <Link className="git-icon" to="https://github.com/labring/sealos">
            <GithubIcon width={'20px'} height={'20px'} color="#fff" />
            <span className="git-stars">{Math.floor(stars / 1000)}k</span>
          </Link>
          {isBrowser && (
            <div
              className="i18nIcon"
              onClick={() =>
                window.location.replace(`${location.origin}${i18nMap[currentLocale].link}`)
              }
            >
              {i18nMap[currentLocale].label}
            </div>
          )}
          <a className="start-now-button" href={`${cloudUrl}?bd_vid=${bd_vid}`} target="_blank">
            {i18nObj.startNow}
            <div className="start-now-button-wrap"></div>
          </a>
        </div>
      </nav>
    </div>
  );
};

export default React.memo(HomeHeader);
