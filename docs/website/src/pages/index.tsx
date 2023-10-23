import '@site/src/css/animate.css';
import Layout from '@theme/Layout';
import React, { useMemo } from 'react';
import { PC_MIN_WIDTH } from '../constants/platform';
import useWindow from '../hooks/useWindow';
import Capability from './components/Capability';
import Community from './components/Community';
import HomeFooter from './components/Footer';
import HomeHeader from './components/Header';
import Introduce from './components/Introduce';
import HomeUserBy from './components/UserBy';
import { Helmet } from 'react-helmet';
import './index.scss';
import Banner from './components/Banner';

const Home = () => {
  const { screenWidth } = useWindow();
  const isPc = useMemo(() => screenWidth > PC_MIN_WIDTH, [screenWidth]);

  const HomeRender = (
    <div id="sealos-layout-wrap-home-page">
      <Banner />
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
        <script
          async
          src="https://umami.cloud.sealos.io/oishii"
          data-website-id="a1c29ace-b288-431a-a2eb-8617d1d5b5ed"
        ></script>
      </Helmet>
      <Layout>
        <div className="home">
          <HomeHeader isPc={isPc} />
          <Capability isPc={isPc} />
          <Introduce isPc={isPc} />
          <Community isPc={isPc} />
          <HomeUserBy isPc={isPc} />
          <HomeFooter isPc={isPc} />
        </div>
      </Layout>
    </div>
  );

  return HomeRender;
};

export default Home;
