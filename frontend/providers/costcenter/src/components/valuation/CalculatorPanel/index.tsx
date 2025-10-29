import CurrencySymbol from '@/components/CurrencySymbol';
import { PricePayload } from '../PriceTablePanel';
import { PRICE_CYCLE_SCALE } from '@/pages/valuation';
import useEnvStore from '@/stores/env';
import { formatMoney } from '@/utils/format';
import { Card, CardContent, CardHeader, CardTitle } from '@sealos/shadcn-ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@sealos/shadcn-ui/select';
import produce from 'immer';
import { useTranslation } from 'next-i18next';
import React, { useMemo, useState } from 'react';
import CycleMenu from '../CycleMenu';
import CalculatorNumberInput from './NumberInput';
import CalculatorSlider from './Slider';
import {
  Boxes,
  CircuitBoard,
  Clock3,
  Cpu,
  HardDrive,
  HdmiPort,
  MemoryStick,
  Network
} from 'lucide-react';
const rangeValToIdx = (val: number, range: number[]) => {
  if (val <= 1) return 0;
  if (val >= range[range.length - 1]) return range.length - 1;
  const idx = range.findIndex((v) => v > val) - 1;
  // get the index of the value in the range
  return idx;
};

const CPU_RANGE = [1, 8, 16, 24, 32];
const MEMORY_RANGE = [1, 16, 32, 64, 128];

export default function CalculatorPanel({ priceData }: { priceData: PricePayload[] }) {
  const { t } = useTranslation();
  const gpuEnabled = useEnvStore((state) => state.gpuEnabled);
  const [config, setConfig] = useState({
    resources: {
      cpu: {
        idx: 0,
        val: 1
      },
      memory: {
        idx: 0,
        val: 1
      },
      storage: 0,
      network: 0,
      gpu: {
        idx: 0,
        count: 0
      },
      ports: 0
    },
    usage: {
      quantity: 1,
      duration: 1,
      timeUnit: 0
    }
  });
  // calculate price
  const updateCpuVal = (val: number) => {
    const idx = rangeValToIdx(val, CPU_RANGE);
    console.log(idx);
    setConfig((prev) => {
      return produce(prev, (draft) => {
        draft.resources.cpu = {
          idx,
          val
        };
      });
    });
  };
  const updateCpuidx = (idx: number) => {
    setConfig((prev) => {
      return produce(prev, (draft) => {
        draft.resources.cpu = {
          idx,
          val: CPU_RANGE[idx]
        };
      });
    });
  };
  const updateMemoryVal = (val: number) => {
    const idx = rangeValToIdx(val, MEMORY_RANGE);
    setConfig((prev) => {
      return produce(prev, (draft) => {
        draft.resources.memory = {
          idx,
          val
        };
      });
    });
  };
  const updateMemoryidx = (idx: number) => {
    setConfig((prev) => {
      return produce(prev, (draft) => {
        draft.resources.memory = {
          idx,
          val: MEMORY_RANGE[idx]
        };
      });
    });
  };
  const updateStorageVal = (val: number) => {
    setConfig((prev) => {
      return produce(prev, (draft) => {
        draft.resources.storage = val;
      });
    });
  };
  const updateNetworkVal = (val: number) => {
    setConfig((prev) => {
      return produce(prev, (draft) => {
        draft.resources.network = val;
      });
    });
  };
  const updateGpuVal = (val: number) => {
    setConfig((prev) => {
      return produce(prev, (draft) => {
        draft.resources.gpu.idx = val;
      });
    });
  };
  const updateGpuCount = (count: number) => {
    setConfig((prev) => {
      return produce(prev, (draft) => {
        draft.resources.gpu.count = count;
      });
    });
  };
  const updatePortVal = (val: number) => {
    setConfig((prev) => {
      return produce(prev, (draft) => {
        draft.resources.ports = val;
      });
    });
  };
  const updateQuantity = (val: number) => {
    setConfig((pre) => {
      return produce(pre, (draft) => {
        draft.usage.quantity = val;
      });
    });
  };
  const updateDuration = (val: number) => {
    setConfig((draft) => {
      return produce(draft, (draft) => {
        draft.usage.duration = val;
      });
    });
  };
  function updateTimeUnit(x: number) {
    setConfig((draft) => {
      return produce(draft, (draft) => {
        draft.usage.timeUnit = x;
      });
    });
  }

  const gpuData = priceData.filter((x) => x.isGpu);
  const totalAmount = useMemo(() => {
    const cpuPrice = priceData.find((x) => x.title === 'cpu')?.price || 0;
    const cpuAmount = config.resources.cpu.val * cpuPrice;
    const memoryPrice = priceData.find((x) => x.title === 'memory')?.price || 0;
    const memoryAmount = config.resources.memory.val * memoryPrice;
    const storagePrice = priceData.find((x) => x.title === 'storage')?.price || 0;
    const storageAmount = config.resources.storage * storagePrice;
    const networkPrice = priceData.find((x) => x.title === 'network')?.price || 0;
    const networkAmount = config.resources.network * networkPrice;

    const portPrice = priceData.find((x) => x.title === 'Port')?.price || 0;
    const portAmount = config.resources.ports * portPrice;
    let amount = cpuAmount + memoryAmount + storageAmount + networkAmount + portAmount;
    if (gpuEnabled) {
      const gpuPrice = gpuData[config.resources.gpu.idx]?.price || 0;
      const gpuAmount = config.resources.gpu.count * gpuPrice;
      amount += gpuAmount;
    }
    amount = Math.floor(amount);
    const duration_scale = PRICE_CYCLE_SCALE[config.usage.timeUnit] || 1;
    console.log(
      'amount: ',
      amount,
      'price: ',
      priceData,
      'duration_scale: ',
      duration_scale,
      'quantity: ',
      config.usage.quantity,
      'duration: ',
      config.usage.duration,
      'timeUnit: ',
      config.usage.timeUnit
    );
    amount = amount * config.usage.quantity * duration_scale * config.usage.duration;

    return formatMoney(amount).toFixed(6);
  }, [
    config.resources.cpu.val,
    config.resources.gpu.count,
    config.resources.gpu.idx,
    config.resources.memory.val,
    config.resources.network,
    config.resources.ports,
    config.resources.storage,
    config.usage.duration,
    config.usage.quantity,
    config.usage.timeUnit,
    gpuData,
    gpuEnabled,
    priceData
  ]);

  return (
    <div>
      <Card>
        <CardHeader className="gap-0 p-5 bg-blue-50">
          <CardTitle className="font-semibold text-xl flex items-center justify-center">
            <span className="text-foreground mr-3">{t('common:total_amount')}: </span>
            <CurrencySymbol className="text-blue-600" />
            <span className="text-blue-600">{totalAmount}</span>
          </CardTitle>
        </CardHeader>

        <CardHeader className="border-y gap-0 p-4 font-medium text-sm rounded-none">
          <CardTitle>
            <span>{t('common:resource')}</span>
          </CardTitle>
        </CardHeader>

        <CardContent className="px-8 py-6 flex flex-col gap-9 text-sm">
          {/** cpu */}
          <div className="flex items-center">
            <div className="flex items-center gap-2 w-[15ch]">
              <Cpu size={20} strokeWidth={1.33} className="text-gray-400" />
              <span>{t('common:cpu')}</span>
            </div>
            <div className="flex items-center gap-10">
              <CalculatorSlider
                rangeList={CPU_RANGE}
                value={config.resources.cpu.idx}
                onChange={(v) => {
                  updateCpuidx(v);
                }}
                unit="C"
              />
              <CalculatorNumberInput
                value={config.resources.cpu.val}
                onChange={(str, v) => updateCpuVal(v)}
                min={0}
                unit={'C'}
              />
            </div>
          </div>
          {/** memory */}
          <div className="flex items-center">
            <div className="flex items-center gap-2 w-[15ch]">
              <MemoryStick size={20} strokeWidth={1.33} className="text-gray-400" />
              <span>{t('common:memory')}</span>
            </div>
            <div className="flex items-center gap-10">
              <CalculatorSlider
                unit={'G'}
                rangeList={MEMORY_RANGE}
                value={config.resources.memory.idx}
                onChange={(v) => {
                  updateMemoryidx(v);
                }}
              />
              <CalculatorNumberInput
                unit={'G'}
                value={config.resources.memory.val}
                onChange={(str, v) => {
                  updateMemoryVal(v);
                }}
                min={0}
              />
            </div>
          </div>
          {/* storage*/}
          <div className="flex items-center">
            <div className="flex items-center gap-2 w-[15ch]">
              <HardDrive size={20} strokeWidth={1.33} className="text-gray-400" />
              <span>{t('common:storage')}</span>
            </div>
            <div className="flex items-center gap-10">
              <CalculatorNumberInput
                unit="G"
                value={config.resources.storage}
                onChange={(str, val) => {
                  if (val < 0) return;
                  updateStorageVal(val);
                }}
                min={0}
              />
            </div>
          </div>
          {/*network*/}
          <div className="flex items-center">
            <div className="flex items-center gap-2 w-[15ch]">
              <Network size={20} strokeWidth={1.33} className="text-gray-400" />
              <span>{t('common:network')}</span>
            </div>
            <div className="flex items-center gap-10">
              <CalculatorNumberInput
                unit="M"
                value={config.resources.network}
                onChange={(str, val) => {
                  if (val < 0) return;
                  updateNetworkVal(val);
                }}
                min={0}
              />
            </div>
          </div>
          {/*gpu*/}
          {gpuEnabled && (
            <div className="flex items-center">
              <div className="flex items-center gap-2 w-[15ch]">
                <CircuitBoard size={20} strokeWidth={1.33} className="text-gray-400" />
                <span>{t('common:gpu')}</span>
              </div>
              <div className="flex items-center gap-5">
                <Select
                  disabled={gpuData.length === 0}
                  value={config.resources.gpu.idx.toString()}
                  onValueChange={(value) => updateGpuVal(parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue>
                      {gpuData[config.resources.gpu.idx] && (
                        <div className="flex items-center gap-2">
                          {React.createElement(gpuData[config.resources.gpu.idx].icon, {
                            className: 'w-4 h-4'
                          })}
                          <span>{gpuData[config.resources.gpu.idx].title}</span>
                        </div>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {gpuData.map((gpu, idx) => (
                      <SelectItem key={idx} value={idx.toString()}>
                        <div className="flex items-center gap-2">
                          {React.createElement(gpu.icon, { className: 'w-4 h-4' })}
                          <span>{gpu.title}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <CalculatorNumberInput
                  unit={t('common:gpu_unit')}
                  value={config.resources.gpu.count}
                  disabled={gpuData.length === 0}
                  onChange={(str, count) => {
                    if (count < 0) return;
                    updateGpuCount(count);
                  }}
                  min={0}
                />
              </div>
            </div>
          )}
          <div className="flex items-center">
            <div className="flex items-center gap-2 w-[15ch]">
              <HdmiPort size={20} strokeWidth={1.33} className="text-gray-400" />
              <span>{t('common:port')}</span>
            </div>
            <div className="flex items-center gap-10">
              <CalculatorNumberInput
                unit={t('common:port_unit')}
                value={config.resources.ports}
                onChange={(str, val) => {
                  if (val < 0) return;
                  updatePortVal(val);
                }}
                min={0}
              />
            </div>
          </div>
        </CardContent>

        <CardHeader className="border-y gap-0 p-4 font-medium text-sm rounded-none">
          <CardTitle>
            <span>{t('common:usage.title')}</span>
          </CardTitle>
        </CardHeader>

        <CardContent className="px-8 py-6 flex flex-col gap-9 text-sm">
          {/*quantity*/}
          <div className="flex items-center">
            <div className="flex items-center gap-2 w-[15ch]">
              <Boxes size={20} strokeWidth={1.33} className="text-gray-400" />
              <span>{t('common:quantity')}</span>
            </div>
            <div className="flex items-center gap-10">
              <CalculatorNumberInput
                value={config.usage.quantity}
                onChange={(str, val) => {
                  console.log(val);
                  updateQuantity(val);
                }}
                min={0}
                max={1000}
              />
            </div>
          </div>
          <div className="flex items-center">
            <div className="flex items-center gap-2 w-[15ch]">
              <Clock3 size={20} strokeWidth={1.33} className="text-gray-400" />
              <span>{t('common:duration')}</span>
            </div>
            <div className="flex items-center gap-5">
              <CalculatorNumberInput
                value={config.usage.duration}
                onChange={(str, val) => {
                  if (val < 0) return;
                  updateDuration(val);
                }}
                min={0}
                max={1000000}
              />
              <CycleMenu
                cycleIdx={config.usage.timeUnit}
                setCycleIdx={(x) => {
                  updateTimeUnit(x);
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
