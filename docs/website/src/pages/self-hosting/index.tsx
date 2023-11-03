import { PC_MIN_WIDTH } from '@site/src/constants/platform';
import useWindow from '@site/src/hooks/useWindow';
import React, { useMemo } from 'react';
import Banner from '../components/Banner';
import Footer from '../components/Footer';
import Header from './header';
import './index.scss';
import Plan from './plan';
import Product from './product';
import Advantage from './advantage';
import Overview from './overview';
import Layout from '@theme/Layout';

export default function Pricing() {
  const { screenWidth } = useWindow();
  const isPc = useMemo(() => screenWidth > PC_MIN_WIDTH, [screenWidth]);

  return (
    <div id="sealos-layout-wrap-home-page">
      <Layout>
        <div className="sealos_price_page">
          {/* <div className="sealo_price_header_bg"></div> */}
          <img
            draggable="false"
            className="header-img"
            src={require('@site/static/img/license-bg-header.png').default}
            alt="community"
          />
          <Banner />
          <div className="px-10 w-full flex justify-center lg:px-0">
            <Header isPc={isPc} />
          </div>
          <Product />
          <Plan />
          <Advantage />
          <Overview />
          <Footer isPc={isPc} />
        </div>
      </Layout>
    </div>
  );
}
