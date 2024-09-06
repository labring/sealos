import { PC_MIN_WIDTH } from '@site/src/constants/platform';
import useWindow from '@site/src/hooks/useWindow';
import React, { useEffect, useMemo } from 'react';
import Footer from '../components/Footer';
import Header from './header';
import './index.scss';
import Plan from './plan';
import Product from './product';
import Advantage from './advantage';
import Overview from './overview';
import Layout from '@theme/Layout';
import Head from '@docusaurus/Head';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';

export default function Pricing() {
  const { screenWidth } = useWindow();
  const { i18n } = useDocusaurusContext();
  const isPc = useMemo(() => screenWidth > PC_MIN_WIDTH, [screenWidth]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const params: Record<string, string> = {};

    const bd_vid = urlParams.get('bd_vid');
    if (bd_vid) params.bd_vid = bd_vid;

    const k = urlParams.get('k');
    if (k) params.keywords = k;

    const s = urlParams.get('s');
    if (s) params.s = s;

    if (Object.keys(params).length > 0) {
      sessionStorage.setItem('sealos_sem', JSON.stringify(params));
    }
  }, []);

  return (
    <div id="sealos-layout-wrap-home-page">
      <Head>
        <title>Sealos企业私有云平台-支持多种复杂应用场景快速落地</title>
        <meta
          name="keywords"
          content={
            i18n.currentLocale === 'en'
              ? 'Sealos, private cloud, enterprise private cloud, private cloud solutions, private cloud deployment, private cloud platform, private cloud providers'
              : 'Sealos,私有云,企业私有云,私有云解决方案,私有云部署,私有云平台,私有云厂商'
          }
        />
        <meta
          name="description"
          content={
            i18n.currentLocale === 'en'
              ? 'Sealos: Next-gen cloud OS with Kubernetes core. Manage multi-region enterprise container clouds effortlessly. Deploy databases instantly, auto-scale resources, ensure top security. Trusted by 100,000+ firms, 1M+ devs. Simplify your cloud journey now!'
              : 'Sealos云操作系统,Kubernetes 云内核,多 Region 统一管理,以应用为中心的企业级容器云,秒级创建高可用数据库,自动伸缩杜绝资源浪费,一键创建容器集群,端到端的应用安全保障，支持多种复杂应用场景快速上云,超10w+企业,近百万开发者在线使用.'
          }
        />
      </Head>

      <Layout>
        <div className="sealos_price_page">
          <img
            draggable="false"
            className="header-img"
            src={require('@site/static/img/license-bg-header.png').default}
            alt="community"
          />
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
