import React, { useState, Fragment } from 'react';
import BulbIcon from '@site/static/price/bulb.svg';
import CpuIcon from '@site/static/price/cpu.svg';
import MemoryIcon from '@site/static/price/memory.svg';
import DiskIcon from '@site/static/price/disk.svg';
import FlowIcon from '@site/static/price/flow.svg';
import useWindow from '@site/src/hooks/useWindow';

export default function Plan() {
  const [select, setSelect] = useState('year');
  const [prices] = useState([
    {
      id: 'CPU',
      icon: <CpuIcon className="lg:w-3 lg:h-3" />,
      label: 'CPU',
      year: {
        unit: '核/年',
        value: '19.60'
      },
      month: {
        unit: '核/月',
        value: '1.61'
      },
      day: {
        unit: '核/天',
        value: '0.05'
      }
    },
    {
      id: '内存',
      icon: <MemoryIcon className="lg:w-3 lg:h-3" />,
      label: '内存',
      year: { unit: 'G/年', value: '9.80' },
      month: {
        unit: 'G/月',
        value: '0.80'
      },
      day: {
        unit: 'G/天',
        value: '0.03'
      }
    },
    {
      id: '存储卷',
      icon: <DiskIcon className="lg:w-3 lg:h-3" />,
      label: '存储卷',
      year: { unit: 'G/年', value: '0' },
      month: { unit: 'G/月', value: '0' },
      day: { unit: 'G/天', value: '0' }
    },
    {
      id: '网络',
      icon: <FlowIcon className="lg:w-3 lg:h-3" />,
      label: '网络',
      year: { unit: 'M/年', value: '0' },
      month: { unit: 'M/月', value: '0' },
      day: { unit: 'M/天', value: '0' }
    }
  ]);
  const { currentLanguage } = useWindow();

  return (
    <div className="mt-56 lg:mt-20 flex items-center w-full max-w-[1280px] flex-col px-10">
      <div className="text-5xl lg:text-2xl font-semibold">计价方案</div>
      <div className="mt-8 text-white/80 w-max-[700px] font-medium text-xl lg:text-sm text-center">
        Sealos 私有云版本采用 按量计费 的方式，根据集群中实际消耗的计算/存储/网络等资源进行计费
      </div>
      <div className="flex w-full mt-24 lg:mt-10 gap-16 lg:gap-8 flex-wrap">
        <div className="flex-1 text-base relative">
          <div className="sealos_price_gradient_background w-[476px] h-[476px]  absolute top-[-40%] left-[-50%] pointer-events-none"></div>
          <div
            className="rounded-t-lg py-4 pl-12 text-white/80"
            style={{
              backgroundColor: 'rgba(183, 216, 255, 0.07)'
            }}
          >
            <div className="flex items-center">
              <div className="flex-1">名称</div>
              <div className="flex-1 flex items-center flex-shrink-0">
                <div className="w-8 mr-3">单位</div>
                <div className="px-2 rounded-md  bg-black/20">
                  <select
                    value={select}
                    className="border-gray-300 border-none bg-transparent text-white/80 text-xs rounded-md block w-[80px] h-[30px] focus-visible:outline-none  lg:w-10"
                    onChange={(e) => {
                      setSelect(e.target.value);
                    }}
                  >
                    <option value="year">年</option>
                    <option value="month">月</option>
                    <option value="day">日</option>
                  </select>
                </div>
              </div>
              <div className="flex-1">价格（元）</div>
            </div>
          </div>
          <div
            className="text-white/90 rounded-b-xl"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.04)'
            }}
          >
            {prices.map((item) => (
              <div className="flex py-6 pl-12" key={item.id}>
                <div className="flex-1 flex items-center gap-2 lg:gap-1">
                  {item.icon}
                  {item.label}
                </div>
                <div className="flex-1 ">{item?.[select]?.unit}</div>
                <div className="flex-1">{item?.[select]?.value}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex-1">
          <div className="flex items-center">
            <BulbIcon className="lg:w-4 lg:h-4" />
            <span className="text-white font-medium text-xl lg:text-sm ml-3">计价示例</span>
          </div>

          {select === 'year' && (
            <div className="my-5 text-lg lg:text-xs font-medium text-white/80">
              如集群中运行一个容器，配额是 CPU 1核 x 内存1G x 存储卷 100G x 网络 10G,
              则一年消耗的费用为 19.6 + 9.80 + 0 + 0 = 29.4元
            </div>
          )}

          {select === 'month' && (
            <div className="my-5 text-lg lg:text-xs font-medium text-white/80">
              如集群中运行一个容器，配额是 CPU 1核 x 内存1G x 存储卷 100G x 网络 10G,
              则一月消耗的费用为 1.61 + 0.80 + 0 + 0 = 2.41元
            </div>
          )}

          {select === 'day' && (
            <div className="my-5 text-lg lg:text-xs font-medium text-white/80">
              如集群中运行一个容器，配额是 CPU 1核 x 内存1G x 存储卷 100G x 网络 10G,
              则一天消耗的费用为 0.05 + 0.03 + 0 + 0 = 0.08元
            </div>
          )}
          <div
            className="flex items-center justify-center w-[134px] h-[50px] lg:h-8 lg:text-xs rounded-md bg-[#B7D8FF26] text-lg font-semibold text-white/80 cursor-pointer "
            onClick={() =>
              window.open(currentLanguage === 'en' ? '/pricing' : '/zh-Hans/pricing', '_self')
            }
          >
            详细文档
          </div>
          <div className="flex items-center mt-12 lg:mt-8 lg:mb-4 mb-5">
            <BulbIcon className="lg:w-4 lg:h-4" />
            <span className="text-white font-medium lg:text-sm text-xl ml-3">
              可通过购买 licence 文件进行续费
            </span>
          </div>
          <div className="flex gap-5 lg:gap-2 flex-wrap  lg:flex-nowrap">
            <div
              className="flex items-center justify-center w-[170px] lg:w-[86px] h-12 lg:h-8 lg:text-xs rounded-md bg-[#BECFDC] text-lg font-semibold text-[#03080C] cursor-pointer"
              onClick={() => window.open('https://license.sealos.io')}
            >
              购买入口
            </div>

            <div
              className="flex items-center justify-center w-[290px] lg:w-[180px] h-12 lg:h-8 lg:text-xs rounded-md bg-[#B7D8FF26] text-lg font-semibold text-white/80 cursor-pointer"
              onClick={() =>
                window.open('https://fael3z0zfze.feishu.cn/docx/MLJVddCVqoEfIwxwP7lcO0P1nch')
              }
            >
              通过 licence 续费文档教程
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
