import CurrencySymbol from '@/components/CurrencySymbol';
import { PricePayload } from '../PriceTablePanel';
import { CYCLE } from '@/constants/valuation';
import { PRICE_CYCLE_SCALE } from '@/pages/valuation';
import useEnvStore from '@/stores/env';
import { formatMoney } from '@/utils/format';
import { Card, CardContent, CardHeader, CardTitle } from '@sealos/shadcn-ui/card';
import { Separator } from '@sealos/shadcn-ui/separator';
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
import { Cpu } from 'lucide-react';
const rangeValToIdx = (val: number, range: number[]) => {
  if (val <= 1) return 0;
  if (val >= range[range.length - 1]) return range.length - 1;
  const idx = range.findIndex((v) => v > val) - 1;
  // get the index of the value in the range
  return idx;
};

const CPU_RANGE = [1, 8, 16, 24, 32];
const MEMORY_RANGE = [1, 16, 32, 64, 128];

export default function CalculatorPanel({ priceData, ...props }: { priceData: PricePayload[] }) {
  const { t } = useTranslation();
  const gpuEnabled = useEnvStore((state) => state.gpuEnabled);
  const currencyType = useEnvStore((state) => state.currency);
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
    <div className="max-w-4xl mx-auto space-y-12">
      <Card className="w-full border border-gray-200 rounded-2xl">
        <CardHeader className="bg-gray-50 rounded-t-2xl">
          <CardTitle className="flex items-center gap-2">
            <div className="w-1 h-2.5 bg-blue-500 rounded-full" />
            <span className="text-gray-900 font-medium">{t('resource')}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {/** cpu */}
          <div className="flex items-center h-9 gap-10">
            <div className="flex items-center gap-1.5 min-w-[147px]">
              <Cpu size={20} />
              <span className="text-sm font-medium text-gray-900">{t('CPU')}</span>
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
                unit={'C'}
                value={config.resources.cpu.val}
                onChange={(str, v) => updateCpuVal(v)}
                min={0}
              />
            </div>
          </div>
          {/** memory */}
          <div className="flex items-center h-9 gap-10">
            <div className="flex items-center gap-1.5 min-w-[147px]">
              <Cpu size={20} />
              <span className="text-sm font-medium text-gray-900">{t('memory')}</span>
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
          <div className="flex items-center h-9 gap-10">
            <div className="flex items-center gap-1.5 min-w-[147px]">
              <Cpu size={20} />
              <span className="text-sm font-medium text-gray-900">{t('storage')}</span>
            </div>
            <div className="flex items-center gap-10">
              <CalculatorNumberInput
                unit="G"
                value={config.resources.storage}
                className="w-72"
                onChange={(str, val) => {
                  if (val < 0) return;
                  updateStorageVal(val);
                }}
                min={0}
              />
            </div>
          </div>
          {/*network*/}
          <div className="flex items-center h-9 gap-10">
            <div className="flex items-center gap-1.5 min-w-[147px]">
              <Cpu size={20} />
              <span className="text-sm font-medium text-gray-900">{t('network')}</span>
            </div>
            <div className="flex items-center gap-10">
              <CalculatorNumberInput
                unit="M"
                value={config.resources.network}
                className="w-72"
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
            <div className="flex items-center h-9 gap-10">
              <div className="flex items-center gap-1.5 min-w-[147px]">
                <Cpu size={20} />
                <span className="text-sm font-medium text-gray-900">{t('GPU')}</span>
              </div>
              <div className="flex items-center gap-3">
                <Select
                  disabled={gpuData.length === 0}
                  value={config.resources.gpu.idx.toString()}
                  onValueChange={(value) => updateGpuVal(parseInt(value))}
                >
                  <SelectTrigger className="w-72">
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
                  unit={t('GPU Unit')}
                  value={config.resources.gpu.count}
                  disabled={gpuData.length === 0}
                  className="w-24"
                  onChange={(str, count) => {
                    if (count < 0) return;
                    updateGpuCount(count);
                  }}
                  min={0}
                />
              </div>
            </div>
          )}
          <div className="flex items-center h-9 gap-10">
            <div className="flex items-center gap-1.5 min-w-[147px]">
              <Cpu size={20} />
              <span className="text-sm font-medium text-gray-900">{t('Port')}</span>
            </div>
            <div className="flex items-center gap-10">
              <CalculatorNumberInput
                unit={t('port_unit')}
                value={config.resources.ports}
                className="w-72"
                onChange={(str, val) => {
                  if (val < 0) return;
                  updatePortVal(val);
                }}
                min={0}
              />
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="w-full border border-gray-200 rounded-2xl">
        <CardHeader className="bg-gray-50 rounded-t-2xl">
          <CardTitle className="flex items-center gap-2">
            <div className="w-1 h-2.5 bg-blue-500 rounded-full" />
            <span className="text-gray-900 font-medium">{t('usage')}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-10">
          {/*quantity*/}
          <div className="flex items-center h-9 gap-10">
            <div className="flex items-center gap-1.5 min-w-[147px]">
              <Cpu size={20} />
              <span className="text-sm font-medium text-gray-900">{t('quantity')}</span>
            </div>
            <div className="flex items-center gap-10">
              <CalculatorNumberInput
                value={config.usage.quantity}
                className="w-72"
                onChange={(str, val) => {
                  console.log(val);
                  updateQuantity(val);
                }}
                min={0}
                max={1000}
              />
            </div>
          </div>
          <div className="flex items-center h-9 gap-10">
            <div className="flex items-center gap-1.5 min-w-[147px]">
              <Cpu size={20} />
              <span className="text-sm font-medium text-gray-900">{t('duration')}</span>
            </div>
            <div className="flex items-center gap-3">
              <CalculatorNumberInput
                value={config.usage.duration}
                className="w-72"
                onChange={(str, val) => {
                  if (val < 0) return;
                  updateDuration(val);
                }}
                min={0}
                max={1000000}
              />
              <CycleMenu
                className={{ trigger: 'w-24' }}
                cycleIdx={config.usage.timeUnit}
                setCycleIdx={(x) => {
                  updateTimeUnit(x);
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>
      <Separator className="w-full border-gray-200" />
      <div className="flex justify-center">
        <div className="flex items-center gap-1 mx-auto">
          <span className="text-gray-900 text-base font-medium">{t('Total Amount')}: </span>
          <span className="text-blue-600 font-medium text-4xl">{totalAmount}</span>
          <CurrencySymbol type={currencyType} className="w-5 h-5" />
          <span className="text-gray-900 text-base font-medium">
            /{t(CYCLE[config.usage.timeUnit])}
          </span>
        </div>
      </div>
    </div>
  );
}
