import '@site/src/css/animate.css';
import Layout from '@theme/Layout';
import React, { useEffect, useMemo } from 'react';
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
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';

const Home = () => {
  const { screenWidth } = useWindow();
  const isPc = useMemo(() => screenWidth > PC_MIN_WIDTH, [screenWidth]);
  const { i18n } = useDocusaurusContext();

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

  const HomeRender = (
    <div id="sealos-layout-wrap-home-page">
      <Head>
        <title>
          {i18n.currentLocale === 'en'
            ? 'Sealos'
            : 'Sealos: 专为云原生开发打造的以 K8s 为内核的云操作系统'}
        </title>
        <meta
          name="keywords"
          content={
            i18n.currentLocale === 'en'
              ? 'Sealos, Docker, Kubernetes, cloud operating system, container orchestration, microservices, DevOps, containerization, cloud infrastructure, hybrid cloud, multi-cloud management, scalable cloud solutions, Container-as-a-Service, cloud-native'
              : 'Sealos,Docker,Kubernetes,云操作系统,云管理平台,云管理,容器云,企业级容器云,容器云部署,容器云厂商,云原生'
          }
        />
        <meta
          name="description"
          content={
            i18n.currentLocale === 'en'
              ? 'Sealos: Next-gen cloud OS with Kubernetes core. Manage multi-region enterprise container clouds effortlessly. Deploy databases instantly, auto-scale resources, ensure top security. Trusted by 100,000+ firms, 1M+ devs. Simplify your cloud journey now!'
              : 'Sealos云操作系统,Kubernetes 云内核,多 Region 统一管理,以应用为中心的企业级容器云,秒级创建高可用数据库,自动伸缩杜绝资源浪费,一键创建容器集群,端到端的应用安全保障，支持多种复杂应用场景快速上云,超10w+企业,近百万开发者在线使用。'
          }
        />
      </Head>
      <Layout>
        <div className="home">
          {/* <SaleBanner /> */}
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
