import CheckIcon from '@site/static/price/check.svg';
import DashedIcon from '@site/static/price/dashed.svg';
import DottedLineIcon from '@site/static/price/dottedLine.svg';
import React, { useEffect, useRef, useState } from 'react';
import './index.scss';
const { Tab, Transition } = require('@headlessui/react');

function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

export default function Overview() {
  const [categories] = useState([
    {
      id: '应用管理',
      label: '应用管理',
      dottedLine: true,
      features: [
        '帮助用户快速运行各种容器应用',
        '支持 Docker hub 上所有镜像的运行',
        '支持各种编程语言业务运行'
      ],
      specificFeatures: [
        '各种 Docker 镜像运行',
        '私有镜像仓库访问',
        '无状态应用多副本高可用运行',
        '无状态应用自动横向伸缩',
        '应用 CPU 内存配额',
        '外网访问/负载均衡',
        '自动 DNS',
        '自动配置 https',
        '应用多端口暴露',
        '启动命令，环境变量，配置文件',
        '有状态应用，存储卷',
        '应用配置导出',
        '重启变更删除升级，应用生命周期管理',
        '日志/终端访问/资源监控',
        '定时任务'
      ]
    },
    {
      id: '数据库管理',
      label: '数据库管理',
      features: ['支持主流的数据库高可用运行'],
      specificFeatures: [
        'mysql/redis/mongo/pgsql',
        '数据库高可用/多副本运行',
        '存储与计算资源配额',
        '自定义 YAML 配置',
        '一键通过终端链接数据库',
        '资源监控/状态监控/性能监控',
        '更新/变更/扩容',
        '手动备份/自动备份/恢复',
        '集群内 DNS 访问'
      ]
    },
    {
      id: '应用市场',
      label: '应用市场',
      features: ['支持各种扩展应用'],
      specificFeatures: [
        '应用上架/安装/卸载',
        '应用组件统一展示',
        '低代码/函数计算/博客系统/播测系统/GPT相关应用',
        '应用扩展',
        '应用添加到桌面快捷方式'
      ]
    },
    {
      id: 'Web 终端',
      label: 'Web 终端',
      features: ['支持 k8s 原生命令，完全兼容 kubectl'],
      specificFeatures: [
        '权限控制，普通租户只有 ns 级别权限',
        '默认安装 kubectl, helm',
        '独立的租户级别 kubeconfig',
        '通过别的应用唤醒 terminal',
        '多个终端列表'
      ]
    },
    {
      id: '多租户',
      label: '多租户',
      features: ['企业多部门/多开发者协作/隔离/权限控制/资源配额'],
      specificFeatures: [
        '用户登录/注册 默认 namespace 分配',
        '多 namespace 创建',
        'Namespace 权限控制与配额',
        '邀请加入协作',
        '租户资源计量与计费'
      ]
    },
    {
      id: '计量/计费系统',
      label: '计量/计费系统',
      features: ['控制企业资源消耗，业务计算资源成本分析，团队额度控制'],
      specificFeatures: [
        '充值/配额',
        '账户站内转账',
        '资源支出大盘',
        '账单详情',
        '计价标准',
        '应用维度精细计量',
        'CPU/内存/磁盘/网络带宽计量计费'
      ]
    },
    {
      id: '开放 API 能力',
      label: '开放 API 能力',
      features: ['所有能力均支持申明式 API'],
      specificFeatures: [
        '下载 kubeconfig 文件',
        '外网通过 kubeconfig 文件连接 apiserver',
        '定制开发扩展应用'
      ]
    },
    {
      id: '函数计算',
      label: '函数计算',
      features: ['写完代码，毫秒级上线，无需关心业务逻辑以外的任何事'],
      specificFeatures: [
        '应用管理/弹性伸缩/规格设置',
        '云函数/在线 IDE',
        '自定义安装包',
        '自动测试',
        '版本管理',
        '二级域名',
        '自动 https',
        '多人协作',
        'Serverless mongo 云数据库',
        '对象存储'
      ]
    }
  ]);
  const [tabIndex, setTabIndex] = useState(0);
  const tabRef = useRef(null); // Create a ref for the Tab component

  useEffect(() => {
    const numTabs = categories.length;
    const interval = setInterval(() => {
      const nextTabIndex = (tabIndex + 1) % numTabs;
      setTabIndex(nextTabIndex);
      // Scroll to the new tab's position, not exceeding the width of the previous tab
      if (tabRef.current) {
        const tabWidth = tabRef.current.offsetWidth;
        const scrollLeft = nextTabIndex * tabWidth - tabWidth; // Scroll back by one tab's width
        tabRef.current.scrollLeft = scrollLeft;
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [tabIndex]);

  return (
    <div className="mt-56 flex items-center w-full max-w-[1280px] flex-col px-10 lg:mt-20">
      <div className="text-5xl font-semibold lg:text-2xl">Sealos 功能概览</div>
      <div className="flex items-center flex-col mt-24 w-full lg:mt-10  lg:w-full lg:px-4">
        <Tab.Group selectedIndex={tabIndex} onChange={setTabIndex}>
          <Tab.List
            className="flex flex-1 pt-[5px] px-[5px] pb-[4px] sealos_overview_tabs rounded-lg border border-solid border-white/5 bg-white/5 gap-2"
            ref={tabRef}
          >
            {categories.map((item) => (
              <Tab
                as="div"
                key={item.id}
                className={({ selected }) =>
                  classNames(
                    'px-8 py-3 text-lg font-semibold focus:outline-none cursor-pointer lg:text-xs  lg:px-5 lg:py-1',
                    selected
                      ? 'text-white bg-[#B7D8FF1A] border border-solid border-white/5 rounded-md'
                      : 'text-white/70',
                    'whitespace-nowrap'
                  )
                }
              >
                {item.label}
              </Tab>
            ))}
          </Tab.List>
          <Tab.Panels
            className={`mt-11 w-full bg-white/5 py-9 px-16 sealos_overview_panel relative`}
          >
            <div className="sealos_overview_gradient_background w-[380px] h-[380px] absolute top-0 left-0 pointer-events-none"></div>

            {categories.map((item, idx) => (
              <Tab.Panel
                key={idx}
                className={`flex items-center justify-center gap-8 lg:flex-col lg:gap-6`}
              >
                <div className="rounded-xl border border-opacity-10 border-white text-[#03080C] bg-[#BECFDC] text-xl lg:text-sm font-semibold py-3 px-6 lg:px-4 lg:py-2 flex-shrink-0">
                  {item.label}
                </div>

                <div className="lg:hidden">
                  {item.dottedLine ? (
                    <DottedLineIcon className="lg:rotate-90 lg:hidden" />
                  ) : (
                    <DashedIcon className="lg:rotate-90 lg:h-14" />
                  )}
                </div>
                <div className="lg:block hidden">
                  <DashedIcon className="lg:rotate-90 lg:h-14" />
                </div>
                <div className="space-y-[30px]">
                  {item.features.map((i) => (
                    <div
                      key={i}
                      className="px-5 py-4 min-w-fit flex justify-center items-center text-base font-medium text-white/90 bg-[#1F2A38] border border-solid border-white/10 rounded-[100px] lg:text-xs lg:px-3 lg:py-2"
                    >
                      {i}
                    </div>
                  ))}
                </div>
                <div>
                  <DashedIcon className="lg:rotate-90 lg:h-14" />
                </div>
                <div className="flex-shrink-0 gap-4 flex flex-col">
                  {item.specificFeatures.map((i) => (
                    <div key={i} className="flex items-center lg:text-xs">
                      <CheckIcon className="mr-4 flex-shrink-0  lg:w-[18px] lg:h-[18px]" />
                      {i}
                    </div>
                  ))}
                </div>
              </Tab.Panel>
            ))}
          </Tab.Panels>
        </Tab.Group>
      </div>
    </div>
  );
}
