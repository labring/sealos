import {
  CpuSlideMarkList,
  MemorySlideMarkList,
  MonthMapList,
  cpuPriceMonth,
  freeValues,
  memoryPriceMonth
} from '@site/src/constants/platform';
import useWindow from '@site/src/hooks/useWindow';
import { useThrottle } from '@site/src/utils';
import CpuIcon from '@site/static/price/cpu.svg';
import DiskIcon from '@site/static/price/disk.svg';
import FlowIcon from '@site/static/price/flow.svg';
import MemoryIcon from '@site/static/price/memory.svg';
import React, { useMemo, useState } from 'react';
import '../index.scss';

export const calculatePrice = (form: { cpu: number; memory: number; months: string }): number => {
  const { cpu, memory, months } = form;

  const cpuTotalPrice = cpuPriceMonth * cpu;
  const memoryTotalPrice = memoryPriceMonth * memory;

  const totalPrice = (cpuTotalPrice + memoryTotalPrice) * parseInt(months);

  if (cpu <= freeValues.cpu && memory <= freeValues.memory && months === freeValues.months) {
    return 0;
  } else {
    return totalPrice;
  }
};

export default function Plan() {
  const [months, setMonths] = useState('3');
  const [cpu, setCpu] = useState(8);
  const [memory, setMemory] = useState(16);

  const price = useMemo(() => {
    return calculatePrice({ cpu, memory, months });
  }, [cpu, memory, months]);

  const min = 1;
  const max = 9999;

  const throttledSetState = useThrottle(
    (
      setter: React.Dispatch<React.SetStateAction<number>>,
      value: number | ((prev: number) => number)
    ) => {
      setter(value);
    },
    30
  );

  const handleCpuChange = (e) => {
    const value = e.target.value;
    const parsedValue = parseInt(value, 10);
    if (!isNaN(parsedValue)) {
      throttledSetState(setCpu, Math.max(1, Math.min(9999, parsedValue)));
    } else {
      throttledSetState(setCpu, 1);
    }
  };

  const incrementCpu = () => {
    setCpu((prevCpu: number) => Math.min(max, prevCpu + 1));
  };

  const decrementCpu = () => {
    setCpu((prevCpu) => Math.max(min, prevCpu - 1));
  };

  const handleMemoryChange = (e) => {
    const value = e.target.value;
    const parsedValue = parseInt(value, 10);
    if (!isNaN(parsedValue)) {
      throttledSetState(setMemory, Math.max(1, Math.min(9999, parsedValue)));
    } else {
      throttledSetState(setMemory, 1);
    }
  };

  const incrementMemory = () => {
    setMemory((prevCpu) => Math.min(max, prevCpu + 1));
  };

  const decrementMemory = () => {
    setMemory((prevCpu) => Math.max(min, prevCpu - 1));
  };

  const { currentLanguage } = useWindow();

  return (
    <div className="mt-56 lg:mt-20 flex items-center w-full max-w-[1280px] flex-col px-10">
      <div className="text-5xl lg:text-2xl font-semibold">计价方案</div>

      <div className="flex w-full mt-24 max-w-[956px] lg:mt-10 gap-16 lg:gap-8 flex-wrap">
        <div
          className="flex flex-col px-16 flex-1 text-base relative rounded-2xl font-medium text-white/70"
          style={{
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.05)'
          }}
        >
          <div className="sealos_price_gradient_background w-[476px] h-[476px]  absolute top-[-40%] left-[-50%] pointer-events-none"></div>
          <div className="rounded-t-lg py-8">
            <div className="flex items-center justify-between">
              <div>单价</div>
              <div className="flex items-center flex-shrink-0">
                <CpuIcon className="lg:w-3 lg:h-3 mr-2" fill="rgba(255, 255, 255, 0.7)" />
                CPU: {cpuPriceMonth} 元/核心/月
                <MemoryIcon className="lg:w-3 lg:h-3 mr-2 ml-12" />
                内存: {memoryPriceMonth} 元/G/月
              </div>
            </div>
          </div>

          <div className="h-[1px] bg-white/5 w-full"></div>

          <div className="flex items-center mt-8">
            <div className="w-28">CPU</div>
            <div className="flex flex-col flex-1 mb-2 justify-center max-w-[487px]">
              <input
                className="input-slider"
                type="range"
                min={1}
                max={2048}
                value={cpu}
                onChange={handleCpuChange}
              />
              <div className="flex text-sm font-medium gap-9 relative">
                {CpuSlideMarkList.map((n, i) => {
                  const v = (n.value / 2048) * 100 + '%';
                  return (
                    <div
                      style={{
                        position: 'absolute',
                        left: CpuSlideMarkList.length === i + 1 ? '95%' : v,
                        top: 0,
                        whiteSpace: 'nowrap',
                        fontSize: '14px'
                      }}
                      key={n.value}
                    >
                      {n.value} {i + 1 === CpuSlideMarkList.length && '核'}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="relative ml-auto">
              <input
                className="input-number"
                min={1}
                max={9999}
                value={cpu}
                onChange={handleCpuChange}
              />
              <div className="absolute w-[24px] right-0 top-0">
                <div
                  onClick={incrementCpu}
                  className="h-4 flex items-center justify-center cursor-pointer"
                  style={{
                    borderLeft: '1px solid rgba(232, 235, 240, 0.05)'
                  }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="13"
                    height="13"
                    viewBox="0 0 13 13"
                    fill="none"
                  >
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M2.82467 8.23954C3.01993 8.4348 3.33651 8.4348 3.53178 8.23954L6.17822 5.59309L8.82467 8.23954C9.01993 8.4348 9.33651 8.4348 9.53178 8.23954C9.72704 8.04428 9.72704 7.7277 9.53178 7.53243L6.53178 4.53243C6.33651 4.33717 6.01993 4.33717 5.82467 4.53243L2.82467 7.53243C2.62941 7.7277 2.62941 8.04428 2.82467 8.23954Z"
                      fill="white"
                      fillOpacity="0.7"
                    />
                  </svg>
                </div>
                <div
                  className="h-4 custom-border-left cursor-pointer flex items-center justify-center"
                  onClick={decrementCpu}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="13"
                    height="13"
                    viewBox="0 0 13 13"
                    fill="none"
                  >
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M2.82467 4.76046C3.01993 4.5652 3.33651 4.5652 3.53178 4.76046L6.17822 7.40691L8.82467 4.76046C9.01993 4.5652 9.33651 4.5652 9.53178 4.76046C9.72704 4.95572 9.72704 5.2723 9.53178 5.46757L6.53178 8.46757C6.33651 8.66283 6.01993 8.66283 5.82467 8.46757L2.82467 5.46757C2.62941 5.2723 2.62941 4.95572 2.82467 4.76046Z"
                      fill="white"
                      fillOpacity="0.7"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Memory */}
          <div className="flex items-center mt-10">
            <div className="w-28">内存</div>
            <div className="flex flex-col flex-1 mb-2 justify-center max-w-[487px]">
              <input
                className="input-slider"
                type="range"
                min={1}
                max={4096}
                value={memory}
                onChange={handleMemoryChange}
              />
              <div className="flex text-sm font-medium gap-9 relative">
                {MemorySlideMarkList.map((n, i) => {
                  const v = (n.value / 4096) * 100 + '%';
                  return (
                    <div
                      style={{
                        position: 'absolute',
                        left: MemorySlideMarkList.length === i + 1 ? '95%' : v,
                        top: 0,
                        whiteSpace: 'nowrap',
                        fontSize: '14px'
                      }}
                      key={n.value}
                    >
                      {n.value} {i + 1 === CpuSlideMarkList.length && 'G'}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="relative ml-auto">
              <input
                className="input-number"
                min={1}
                max={9999}
                value={memory}
                onChange={handleMemoryChange}
              />
              <div className="absolute w-[24px] right-0 top-0">
                <div
                  onClick={incrementMemory}
                  className="h-4 flex items-center justify-center cursor-pointer"
                  style={{
                    borderLeft: '1px solid rgba(232, 235, 240, 0.05)'
                  }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="13"
                    height="13"
                    viewBox="0 0 13 13"
                    fill="none"
                  >
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M2.82467 8.23954C3.01993 8.4348 3.33651 8.4348 3.53178 8.23954L6.17822 5.59309L8.82467 8.23954C9.01993 8.4348 9.33651 8.4348 9.53178 8.23954C9.72704 8.04428 9.72704 7.7277 9.53178 7.53243L6.53178 4.53243C6.33651 4.33717 6.01993 4.33717 5.82467 4.53243L2.82467 7.53243C2.62941 7.7277 2.62941 8.04428 2.82467 8.23954Z"
                      fill="white"
                      fillOpacity="0.7"
                    />
                  </svg>
                </div>
                <div
                  className="h-4 custom-border-left cursor-pointer flex items-center justify-center"
                  onClick={decrementMemory}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="13"
                    height="13"
                    viewBox="0 0 13 13"
                    fill="none"
                  >
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M2.82467 4.76046C3.01993 4.5652 3.33651 4.5652 3.53178 4.76046L6.17822 7.40691L8.82467 4.76046C9.01993 4.5652 9.33651 4.5652 9.53178 4.76046C9.72704 4.95572 9.72704 5.2723 9.53178 5.46757L6.53178 8.46757C6.33651 8.66283 6.01993 8.66283 5.82467 8.46757L2.82467 5.46757C2.62941 5.2723 2.62941 4.95572 2.82467 4.76046Z"
                      fill="white"
                      fillOpacity="0.7"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center mt-10">
            <div className="w-28">月数</div>
            <div className="relative">
              <select
                value={months}
                onChange={(e) => {
                  setMonths(e.target.value);
                }}
                className="w-52 input-select h-8 border-gray-300 border-none bg-transparent text-white/80 text-xs rounded-md block focus-visible:outline-none lg:w-10"
                style={{
                  borderRadius: '6px',
                  border: '1px solid rgba(232, 235, 240, 0.10)',
                  background: 'rgba(247, 248, 250, 0.10)'
                }}
              >
                {MonthMapList.map((item) => (
                  <option key={item.label} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
              <div className="absolute top-[6px] right-[10px]">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="17"
                  height="16"
                  viewBox="0 0 17 16"
                  fill="none"
                >
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M4.32173 5.52851C4.58208 5.26816 5.00419 5.26816 5.26454 5.52851L8.79313 9.05711L12.3217 5.52851C12.5821 5.26816 13.0042 5.26816 13.2645 5.52851C13.5249 5.78886 13.5249 6.21097 13.2645 6.47132L9.26454 10.4713C9.00419 10.7317 8.58208 10.7317 8.32173 10.4713L4.32173 6.47132C4.06138 6.21097 4.06138 5.78886 4.32173 5.52851Z"
                    fill="white"
                    fillOpacity="0.7"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div
            className="flex justify-end text-[#85CCFF] font-medium cursor-pointer text-xs mt-8"
            onClick={() => {
              setCpu(freeValues.cpu);
              setMemory(freeValues.memory);
              setMonths(freeValues.months);
            }}
          >
            免费规模
          </div>
          <div className="h-[1px] bg-white/5 w-full mt-2"></div>

          <div className="my-8 flex items-center justify-between">
            <div
              className="items-center flex gap-2  cursor-pointer"
              onClick={() =>
                window.open(currentLanguage === 'en' ? '/pricing' : '/zh-Hans/pricing', '_self')
              }
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="22"
                height="22"
                viewBox="0 0 22 22"
                fill="none"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M5.06156 3.08594L5.48628 3.08594C6.42365 3.08593 7.18594 3.08592 7.80455 3.13646C8.4435 3.18867 9.01416 3.29959 9.54511 3.57013C10.1122 3.85906 10.6073 4.26475 11.0001 4.75678C11.3929 4.26475 11.888 3.85906 12.4551 3.57013C12.986 3.29959 13.5567 3.18867 14.1956 3.13646C14.8143 3.08592 15.5766 3.08593 16.5139 3.08594L16.9386 3.08594C17.3935 3.08592 17.7919 3.0859 18.1213 3.11281C18.4708 3.14137 18.8271 3.20499 19.1724 3.38093C19.6816 3.6404 20.0956 4.05444 20.3551 4.56369C20.5311 4.90898 20.5947 5.26528 20.6232 5.61477C20.6501 5.94413 20.6501 6.34253 20.6501 6.79738V15.2027C20.6501 15.6576 20.6501 16.056 20.6232 16.3853C20.5947 16.7348 20.5311 17.0911 20.3551 17.4364C20.0956 17.9457 19.6816 18.3597 19.1724 18.6192C18.8271 18.7951 18.4708 18.8587 18.1213 18.8873C17.7919 18.9142 17.3935 18.9142 16.9386 18.9142H5.06158C4.60671 18.9142 4.2083 18.9142 3.87893 18.8873C3.52944 18.8587 3.17314 18.7951 2.82785 18.6192C2.3186 18.3597 1.90456 17.9457 1.64509 17.4364C1.46915 17.0911 1.40553 16.7348 1.37697 16.3853C1.35006 16.056 1.35008 15.6576 1.3501 15.2027V6.7974C1.35008 6.34254 1.35006 5.94413 1.37697 5.61477C1.40553 5.26528 1.46915 4.90898 1.64509 4.56369C1.90456 4.05444 2.3186 3.6404 2.82785 3.38093C3.17314 3.20499 3.52944 3.14137 3.87893 3.11281C4.20829 3.0859 4.6067 3.08592 5.06156 3.08594ZM10.0295 9.61135C10.0295 8.62314 10.0288 7.94036 9.98545 7.41013C9.94306 6.89123 9.86478 6.60446 9.75691 6.39276C9.51712 5.92213 9.13448 5.5395 8.66385 5.2997C8.45215 5.19183 8.16539 5.11356 7.64648 5.07116C7.11625 5.02784 6.43347 5.02708 5.44527 5.02708H5.09809C4.59598 5.02708 4.27777 5.02784 4.037 5.04751C3.80756 5.06626 3.73515 5.09723 3.70911 5.1105C3.56511 5.18387 3.44803 5.30095 3.37466 5.44495C3.36139 5.47099 3.33042 5.5434 3.31167 5.77284C3.292 6.01361 3.29124 6.33182 3.29124 6.83393V15.1662C3.29124 15.6683 3.292 15.9865 3.31167 16.2273C3.33042 16.4567 3.36139 16.5291 3.37466 16.5552C3.44803 16.6992 3.56511 16.8162 3.70911 16.8896C3.73515 16.9029 3.80756 16.9339 4.037 16.9526C4.27777 16.9723 4.59598 16.973 5.09809 16.973H10.0295V9.61135ZM11.9707 16.973V9.61135C11.9707 8.62314 11.9714 7.94036 12.0148 7.41013C12.0571 6.89123 12.1354 6.60446 12.2433 6.39276C12.4831 5.92213 12.8657 5.5395 13.3364 5.2997C13.5481 5.19183 13.8348 5.11356 14.3537 5.07116C14.884 5.02784 15.5667 5.02708 16.5549 5.02708H16.9021C17.4042 5.02708 17.7224 5.02784 17.9632 5.04751C18.1926 5.06626 18.2651 5.09723 18.2911 5.1105C18.4351 5.18387 18.5522 5.30095 18.6255 5.44495C18.6388 5.47099 18.6698 5.5434 18.6885 5.77284C18.7082 6.01361 18.709 6.33182 18.709 6.83393V15.1662C18.709 15.6683 18.7082 15.9865 18.6885 16.2273C18.6698 16.4567 18.6388 16.5291 18.6255 16.5552C18.5522 16.6992 18.4351 16.8162 18.2911 16.8896C18.2651 16.9029 18.1926 16.9339 17.9632 16.9526C17.7224 16.9723 17.4042 16.973 16.9021 16.973H11.9707Z"
                  fill="white"
                  fillOpacity="0.7"
                />
              </svg>
              <div className="text-white/70 text-sm font-medium">详细文档</div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-sm font-medium">价格</div>
              <div className="text-[#85CCFF] text-3xl font-medium">¥ {price}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
