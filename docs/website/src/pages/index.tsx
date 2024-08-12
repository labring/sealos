import '@site/src/css/animate.css';
import Layout from '@theme/Layout';
import React, { useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { PC_MIN_WIDTH } from '../constants/platform';
import useWindow from '../hooks/useWindow';
import Capability from './components/Capability';
import Community from './components/Community';
import HomeFooter from './components/Footer';
import HomeHeader from './components/Header';
import Introduce from './components/Introduce';
import HomeUserBy from './components/UserBy';
import './index.scss';
import Head from '@docusaurus/Head';
import SaleBanner from '../components/SaleBanner';

const Home = () => {
  const { screenWidth, currentLanguage } = useWindow();
  const isPc = useMemo(() => screenWidth > PC_MIN_WIDTH, [screenWidth]);

  useEffect(() => {
    const loadUmamiScript = () => {
      const hostname = window.location.hostname;
      if (hostname === 'sealos.run') {
        const script1 = document.createElement('script');
        script1.src = 'https://umami.cloud.sealos.io/oishii';
        script1.setAttribute('data-website-id', 'e5a8009f-7cb6-4841-9522-d23b96216b7a');
        script1.async = true;
        document.head.appendChild(script1);
      } else {
        const script2 = document.createElement('script');
        script2.src = 'https://umami.cloud.sealos.io/oishii';
        script2.setAttribute('data-website-id', 'a1c29ace-b288-431a-a2eb-8617d1d5b5ed');
        script2.async = true;
        document.head.appendChild(script2);
      }
    };
    loadUmamiScript();
  }, []);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const bd_vidValue = urlParams.get('bd_vid');
    sessionStorage.setItem('bd_vid', bd_vidValue);
  }, []);

  const HomeRender = (
    <div id="sealos-layout-wrap-home-page">
      <Head>
        <title>
          {currentLanguage === 'en'
            ? 'Sealos'
            : 'Sealos: 专为云原生开发打造的以 K8s 为内核的云操作系统'}
        </title>
      </Head>
      <Helmet>
        <script async src="https://www.googletagmanager.com/gtag/js?id=AW-786053845" />
        <script async>
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'AW-786053845');
            gtag('event', 'conversion', {'send_to': 'AW-786053845/LpbTCJ-8-coYENX16PYC'});
          `}
        </script>
      </Helmet>
      <Layout>
        <div className="home">
          <HomeHeader isPc={isPc} />
          <Capability isPc={isPc} />
          <Introduce isPc={isPc} />
          <Community isPc={isPc} />
          {/* <HomeUserBy isPc={isPc} /> */}
          <HomeFooter isPc={isPc} />
        </div>
      </Layout>
    </div>
  );

  return HomeRender;
};

export default Home;
