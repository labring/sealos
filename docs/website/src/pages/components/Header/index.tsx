import Link from '@docusaurus/Link';
import Translate from '@docusaurus/Translate';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import useIsBrowser from '@docusaurus/useIsBrowser';
import useWindow from '@site/src/hooks/useWindow';
import GithubIcon from '@site/static/icons/github.svg';
import MeunIcon from '@site/static/icons/meun.svg';
import LogoIcon from '@site/static/icons/sealos.svg';
import React, { useEffect, useState } from 'react';
import VideoPlayer from '../VideoPlayer';
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
    to: '/self-hosting '
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
  const { cloudUrl } = useWindow();

  const i18nMap: { [key: string]: { label: string; link: string } } = {
    en: { label: '中', link: '/zh-Hans/' },
    ['zh-Hans']: { label: 'En', link: '/' }
  };

  const {
    i18n: { currentLocale },
    siteConfig: {
      themeConfig: {
        // @ts-ignore nextLine
        // navbar: { items: navbarData }
      }
    }
  } = useDocusaurusContext();

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
      <div id="Start" className="home-header">
        <img
          draggable="false"
          className="header-img"
          src={require('@site/static/img/bg-header.png').default}
          alt="community"
        />
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
        <main>
          {currentLocale === 'en' ? (
            <h1>
              <span className="txt-title">Kubernetes&nbsp;</span>
              <span className="txt-aid">as the kernel</span>
            </h1>
          ) : (
            <h1>
              <span className="txt-aid">以&nbsp;</span>
              <span className="txt-title">Kubernetes&nbsp;</span>
              <span className="txt-aid">为内核</span>
            </h1>
          )}

          <h2>{i18nObj.cloudOS}</h2>

          {currentLocale === 'en' ? (
            <h3>
              Abstracting the entire data center as a singular server, where everything is an
              application. You can use Sealos as seamlessly as operating a&nbsp;
              <span className="txt-title">personal computer.</span>
            </h3>
          ) : (
            <h3>
              整个数据中心抽象成一台服务器，一切皆应用，像使用
              <span className="txt-title">个人电脑</span>
              一样使用 Sealos！
            </h3>
          )}
          <a className="start-now-button" href={cloudUrl} target="_blank">
            {i18nObj.startNow}
            <div className="start-now-button-wrap"></div>
          </a>
          <VideoPlayer url={'https://itceb8-video.oss.laf.run/sealos-website.mp4'}></VideoPlayer>
        </main>
      </div>
    );
  }

  return (
    <div id="Start" className="home-header">
      <img
        draggable="false"
        className="header-img"
        src={require('@site/static/img/bg-header.png').default}
        alt="community"
      />
      <nav>
        <div className="left">
          <div
            className="sealos_home_header_title"
            onClick={() =>
              window.location.replace(
                `${location.origin}${currentLocale === 'en' ? '/' : '/zh-Hans/'}`
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
            <div className="i18nIcon">
              <Link to={`${location.origin}${i18nMap[currentLocale]?.link}`} target="_self">
                {i18nMap[currentLocale]?.label}
              </Link>
            </div>
          )}
          <a className="start-now-button" href={cloudUrl} target="_blank">
            {i18nObj.startNow}
            <div className="start-now-button-wrap"></div>
          </a>
        </div>
      </nav>
      <main>
        {currentLocale === 'en' ? (
          <h1>
            <span className="txt-title">Kubernetes&nbsp;</span>
            <span className="txt-aid">as the kernel</span>
          </h1>
        ) : (
          <h1>
            <span className="txt-aid">以&nbsp;</span>
            <span className="txt-title">Kubernetes&nbsp;</span>
            <span className="txt-aid">为内核</span>
          </h1>
        )}

        <h2>{i18nObj.cloudOS}</h2>

        {currentLocale === 'en' ? (
          <h3>
            Abstracting the entire data center as a singular server, where everything is an
            application. You can use Sealos as seamlessly as operating a&nbsp;
            <span className="txt-title">personal computer.</span>
          </h3>
        ) : (
          <h3>
            整个数据中心抽象成一台服务器，一切皆应用，像使用
            <span className="txt-title">个人电脑</span>
            一样使用 Sealos！
          </h3>
        )}

        <VideoPlayer url={'https://itceb8-video.oss.laf.run/sealos-website.mp4'}></VideoPlayer>
      </main>
    </div>
  );
};

export default React.memo(HomeHeader);
