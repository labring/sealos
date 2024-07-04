import React, { useState, useRef } from 'react';
import ChevronUpIcon from '@site/static/price/chevronUp.svg';
const { Disclosure, Transition } = require('@headlessui/react');
import DataBaseIcon from '@site/static/price/database.svg';
import GroupsIcon from '@site/static/price/groups.svg';
import LaunchpadIcon from '@site/static/price/launchpad.svg';
import QueueIcon from '@site/static/price/queue.svg';
import PublicCloudIcon from '@site/static/price/publicCloud.svg';
import WidAppsIcon from '@site/static/price/wideApps.svg';
import ClarityClusterIcon from '@site/static/price/clarityCluster.svg';
import CloudServerIcon from '@site/static/price/cloudServer.svg';
import LightIcon from '@site/static/price/lightning.svg';
import MoneyIcon from '@site/static/price/money.svg';

function Akkordion({ items }) {
  const buttonRefs = useRef([]);
  const openedRef = useRef(null);

  const clickRecent = (index) => {
    const clickedButton = buttonRefs.current[index];
    if (clickedButton === openedRef.current) {
      openedRef.current = null;
      return;
    }
    if (Boolean(openedRef.current?.getAttribute('data-value'))) {
      openedRef.current?.click();
    }
    openedRef.current = clickedButton;
  };

  return (
    <div className="mt-11 w-full ">
      {items.map((item, index) => (
        <Disclosure key={item.title} className="mt-2">
          {({ open }) => (
            <>
              <Disclosure.Button
                as="div"
                data-value={open}
                ref={(ref) => {
                  buttonRefs.current[index] = ref;
                }}
                onClick={() => clickRecent(index)}
                className={`${
                  open ? 'bg-white bg-opacity-5' : 'hover:rounded-b-xl'
                } flex items-center justify-between lg:text-sm rounded-t-xl px-8 py-6 hover:bg-white/5 mt-1`}
              >
                <div className="flex text-xl items-center font-semibold text-white text-opacity-90 lg:text-sm">
                  {item.icon}
                  {item.title}
                </div>
                <ChevronUpIcon
                  className={`${
                    open ? 'rotate-180 transform' : 'rotate-90 transform'
                  } lg:w-5 lg:h-5 `}
                />
              </Disclosure.Button>
              <Transition
                show={open}
                enter="transition-all duration-300 ease-out"
                enterFrom="transform max-h-0 opacity-0"
                enterTo="transform max-h-[16rem] opacity-100"
                leave="transition-all duration-300 ease-in"
                leaveFrom="transform max-h-[16rem] opacity-100"
                leaveTo="transform max-h-0 opacity-0"
              >
                <Disclosure.Panel
                  static
                  className={`${
                    open ? ' bg-white bg-opacity-5' : ''
                  } px-8 pt-2 pb-6 rounded-b-xl overflow-hidden lg:text-xs`}
                >
                  {item.value}
                </Disclosure.Panel>
              </Transition>
            </>
          )}
        </Disclosure>
      ))}
    </div>
  );
}

export default function Advantage() {
  const Advantage1 = [
    {
      title: '应用管理',
      value: '快速部署任意分布式应用',
      icon: <LaunchpadIcon className="mr-4 lg:w-5 lg:h-5" />
    },
    {
      title: '丰富的数据库支持',
      value:
        '秒级创建高可用数据库，支持 MySQL、PostgreSQL、MongoDB 和 Redis 等，满足您的各种数据存储需求',
      icon: <DataBaseIcon className="mr-4 lg:w-5 lg:h-5" />
    },
    {
      title: '消息队列支持',
      value: '支持多种消息队列，包含 Kafka、RocketMQ 和 RabbitMQ 等',
      icon: <QueueIcon className="mr-4 lg:w-5 lg:h-5" />
    },
    {
      title: '多租户能力',
      value: '其独特的多租户共享机制，能在保障安全的前提下实现资源的有效隔离和协作',
      icon: <GroupsIcon className="mr-4 lg:w-5 lg:h-5" />
    }
  ];

  const Advantage2 = [
    {
      title: '公有云经验',
      value:
        'Sealos 公有云服务已经得到了数万开发者的验证，其稳定性得到了广大用户的认可。只需一键就可以在私有云环境中获得与公有云相同的能力',
      icon: <PublicCloudIcon className="mr-4 lg:w-5 lg:h-5" />
    },
    {
      title: '应用广泛',
      value: '已经有数千家企业选择在生产环境中使用 Sealos 私有云，这也是对其稳定性的最好证明',
      icon: <WidAppsIcon className="mr-4 lg:w-5 lg:h-5" />
    },
    {
      title: '支持大规模集群',
      value: 'Sealos 能够支撑超大规模的集群，能够在上万节点规模上运行，满足大型企业的需求',
      icon: <ClarityClusterIcon className="mr-4 lg:w-5 lg:h-5" />
    }
  ];

  const Advantage3 = [
    {
      title: '快速部署',
      value: '一键构建一个生产级别的云操作系统，而且只需要半个人力就可以维护',
      icon: <LightIcon className="mr-4 lg:w-5 lg:h-5" />
    },
    {
      title: '成本节省',
      value: '与主流的云服务厂商相比，Sealos 的软硬件综合成本可以节省 80% 以上的费用',
      icon: <MoneyIcon className="mr-4 lg:w-5 lg:h-5" />
    },
    {
      title: '资源高效利用',
      value: '使用 Sealos 私有云，一台服务器就可以运行上千个应用，极度提升资源利用率',
      icon: <CloudServerIcon className="mr-4 lg:w-5 lg:h-5" />
    }
  ];
  return (
    <div className="mt-56 flex items-center w-full max-w-[1280px] flex-col px-10 lg:mt-20 ">
      <div className="text-5xl font-semibold lg:text-2xl">Sealos 私有云优势</div>

      <div className="flex w-full mt-24 gap-9 flex-wrap lg:mt-10 relative">
        <div className="sealos_price_gradient_background w-[476px] h-[476px]  absolute top-0 right-0 pointer-events-none"></div>
        <div className="flex flex-1 items-center flex-col basis-[370px] ">
          <div className="lg:gap-3 items-center flex flex-col lg:flex-row">
            <div className="flex items-center justify-center w-16 lg:w-8 lg:h-8 h-16 rounded-full bg-[#193246]">
              <div className="flex items-center justify-center w-[52px] h-[52px] lg:w-[26px] lg:h-[26px] rounded-full bg-[#BECFDC]">
                <span className="text-2xl text-[#06111E] lg:text-sm font-semibold">1</span>
              </div>
            </div>
            <div className="text-white text-2xl font-semibold mt-6 lg:mt-0  lg:text-lg">
              功能强大
            </div>
          </div>
          <Akkordion items={Advantage1} />
        </div>

        <div className="flex flex-1 items-center flex-col basis-[370px] ">
          <div className="lg:gap-3 items-center flex flex-col lg:flex-row">
            <div className="flex items-center justify-center w-16 lg:w-8 lg:h-8 h-16 rounded-full bg-[#193246]">
              <div className="flex items-center justify-center w-[52px] h-[52px] lg:w-[26px] lg:h-[26px] rounded-full bg-[#BECFDC]">
                <span className="text-2xl text-[#06111E] lg:text-sm font-semibold">2</span>
              </div>
            </div>
            <div className="text-white text-2xl font-semibold mt-6 lg:mt-0  lg:text-lg">
              稳定性超群
            </div>
          </div>
          <Akkordion items={Advantage2} />
        </div>

        <div className="flex flex-1 items-center flex-col basis-[370px] ">
          <div className="lg:gap-3 items-center flex flex-col lg:flex-row">
            <div className="flex items-center justify-center w-16 lg:w-8 lg:h-8 h-16 rounded-full bg-[#193246]">
              <div className="flex items-center justify-center w-[52px] h-[52px] lg:w-[26px] lg:h-[26px] rounded-full bg-[#BECFDC]">
                <span className="text-2xl text-[#06111E] lg:text-sm font-semibold">3</span>
              </div>
            </div>
            <div className="text-white text-2xl font-semibold mt-6 lg:mt-0  lg:text-lg">
              高效的成本控制
            </div>
          </div>
          <Akkordion items={Advantage3} />
        </div>
      </div>
    </div>
  );
}
