import CurrencySymbol from '@/components/CurrencySymbol';
import { ClockIcon } from '@/components/icons/ClockIcon';
import CpuIcon from '@/components/icons/CpuIcon';
import GpuIcon from '@/components/icons/GpuIcon';
import { MemoryIcon } from '@/components/icons/MemoryIcon';
import { NetworkIcon } from '@/components/icons/NetworkIcon';
import { NodeIcon } from '@/components/icons/NodeIcon';
import { PortIcon } from '@/components/icons/PortIcon';
import { StorageIcon } from '@/components/icons/StorageIcon';
import BaseMenu from '@/components/menu/BaseMenu';
import { PricePayload } from '@/components/table/PriceTable';
import { CYCLE } from '@/constants/valuation';
import { PRICE_CYCLE_SCALE } from '@/pages/valuation';
import useEnvStore from '@/stores/env';
import { formatMoney } from '@/utils/format';
import {
  Box,
  Center,
  Divider,
  Flex,
  HStack,
  Stack,
  TabPanel,
  TabPanelProps,
  Text,
  VStack
} from '@chakra-ui/react';
import produce from 'immer';
import { useTranslation } from 'next-i18next';
import { useMemo, useState } from 'react';
import CycleMenu from '../CycleMenu';
import CalculatorNumberInput from './NumberInput';
import CalculatorSlider from './Slider';
const rangeValToIdx = (val: number, range: number[]) => {
  if (val <= 1) return 0;
  if (val >= range[range.length - 1]) return range.length - 1;
  const idx = range.findIndex((v) => v > val) - 1;
  // get the index of the value in the range
  return idx;
};

const CPU_RANGE = [1, 8, 16, 24, 32];
const MEMORY_RANGE = [1, 16, 32, 64, 128];
export default function CalculatorPanel({
  priceData,
  ...props
}: { priceData: PricePayload[] } & TabPanelProps) {
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
    <TabPanel px={'0'} h="full" minW={'900px'} {...props}>
      {/* <Box margin="auto" padding={6}> */}
      <VStack spacing={'48px'} mx={'auto'}>
        <Flex alignItems={'flex-start'} minW={'830px'}>
          <HStack gap={'8px'} h={'32px'} w={'132px'}>
            <Box bgColor={'brightBlue.500'} width={'4px'} h={'10px'} borderRadius={'full'} />
            <Text color={'grayModern.900'} fontWeight={500}>
              {t('resource')}
            </Text>
          </HStack>

          <Stack gap={'24px'}>
            {/** cpu */}
            <Flex h={'36px'}>
              <HStack minW={'147px'} gap={'6px'}>
                <CpuIcon boxSize={'18px'} />
                <Text fontSize={'14px'} fontWeight={500} color={'grayModern.900'}>
                  {t('CPU')}
                </Text>
              </HStack>
              <HStack gap={'40px'}>
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
              </HStack>
            </Flex>
            {/** memory */}
            <Flex h={'36px'}>
              <HStack minW={'147px'} gap={'6px'}>
                <MemoryIcon boxSize={'18px'} />
                <Text fontSize={'14px'} fontWeight={500} color={'grayModern.900'}>
                  {t('memory')}
                </Text>
              </HStack>
              <HStack gap={'40px'}>
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
              </HStack>
            </Flex>
            {/* storage*/}
            <Flex h={'36px'}>
              <HStack minW={'147px'} gap={'6px'}>
                <StorageIcon boxSize={'18px'} />
                <Text fontSize={'14px'} fontWeight={500} color={'grayModern.900'}>
                  {t('storage')}
                </Text>
              </HStack>
              <HStack gap={'40px'}>
                <CalculatorNumberInput
                  unit="G"
                  value={config.resources.storage}
                  width={'280px'}
                  onChange={(str, val) => {
                    if (val < 0) return;
                    updateStorageVal(val);
                  }}
                  min={0}
                />
              </HStack>
            </Flex>
            {/*network*/}
            <Flex h={'36px'}>
              <HStack minW={'147px'} gap={'6px'}>
                <NetworkIcon boxSize={'18px'} />
                <Text fontSize={'14px'} fontWeight={500} color={'grayModern.900'}>
                  {t('network')}
                </Text>
              </HStack>
              <HStack gap={'40px'}>
                <CalculatorNumberInput
                  unit="M"
                  value={config.resources.network}
                  width={'280px'}
                  onChange={(str, val) => {
                    if (val < 0) return;
                    updateNetworkVal(val);
                  }}
                  min={0}
                />
              </HStack>
            </Flex>
            {/*gpu*/}
            {gpuEnabled && (
              <Flex h={'36px'}>
                <HStack minW={'147px'} gap={'6px'}>
                  <GpuIcon boxSize={'18px'} />
                  <Text fontSize={'14px'} fontWeight={500} color={'grayModern.900'}>
                    {t('GPU')}
                  </Text>
                </HStack>
                <HStack gap={'12px'}>
                  <BaseMenu
                    isDisabled={gpuData.length === 0}
                    setItem={function (idx: number): void {
                      updateGpuVal(idx);
                    }}
                    innerWidth={'280px'}
                    itemIdx={config.resources.gpu.idx}
                    itemlist={gpuData.map((x) => x.title)}
                    triggerRender={({ text, idx }) => {
                      const Icon = gpuData[idx].icon;
                      return (
                        <Flex key={idx}>
                          <Icon />
                          <Text>{text}</Text>
                        </Flex>
                      );
                    }}
                    itemRender={({ text, idx }) => {
                      const Icon = gpuData[idx].icon;
                      return (
                        <Flex key={idx}>
                          <Icon />
                          <Text>{text}</Text>
                        </Flex>
                      );
                    }}
                  ></BaseMenu>
                  <CalculatorNumberInput
                    unit={t('GPU Unit')}
                    value={config.resources.gpu.count}
                    isDisabled={gpuData.length === 0}
                    width={'104px'}
                    onChange={(str, count) => {
                      if (count < 0) return;
                      updateGpuCount(count);
                    }}
                    min={0}
                  />
                </HStack>
              </Flex>
            )}
            <Flex h={'36px'}>
              <HStack minW={'147px'} gap={'6px'}>
                <PortIcon boxSize={'18px'} />
                <Text fontSize={'14px'} fontWeight={500} color={'grayModern.900'}>
                  {t('Port')}
                </Text>
              </HStack>
              <HStack gap={'40px'}>
                <CalculatorNumberInput
                  unit={t('port_unit')}
                  value={config.resources.ports}
                  width={'280px'}
                  onChange={(str, val) => {
                    if (val < 0) return;
                    updatePortVal(val);
                  }}
                  min={0}
                />
              </HStack>
            </Flex>
          </Stack>
        </Flex>
        <Flex alignItems={'flex-start'} minW={'830px'}>
          <HStack gap={'8px'} h={'32px'} w={'132px'}>
            <Box bgColor={'brightBlue.500'} width={'4px'} h={'10px'} borderRadius={'full'} />
            <Text color={'grayModern.900'} fontWeight={500}>
              {t('usage')}
            </Text>
          </HStack>

          <Stack gap={'40px'}>
            {/*quantity*/}
            <Flex h={'36px'}>
              <HStack minW={'147px'} gap={'6px'}>
                <NodeIcon boxSize={'18px'} />
                <Text fontSize={'14px'} fontWeight={500} color={'grayModern.900'}>
                  {t('quantity')}
                </Text>
              </HStack>
              <HStack gap={'40px'}>
                <CalculatorNumberInput
                  value={config.usage.quantity}
                  width={'280px'}
                  onChange={(str, val) => {
                    console.log(val);
                    updateQuantity(val);
                  }}
                  min={0}
                  max={1000}
                />
              </HStack>
            </Flex>
            <Flex h={'36px'}>
              <HStack minW={'147px'} gap={'6px'}>
                <ClockIcon boxSize={'18px'} />
                {/** 持续时间 */}
                <Text fontSize={'14px'} fontWeight={500} color={'grayModern.900'}>
                  {t('duration')}
                </Text>
              </HStack>
              <HStack gap={'12px'}>
                <CalculatorNumberInput
                  value={config.usage.duration}
                  width={'280px'}
                  onChange={(str, val) => {
                    if (val < 0) return;
                    updateDuration(val);
                  }}
                  min={0}
                  max={1000000}
                />
                <CycleMenu
                  width={'100px'}
                  cycleIdx={config.usage.timeUnit}
                  setCycleIdx={(x) => {
                    updateTimeUnit(x);
                  }}
                ></CycleMenu>
              </HStack>
            </Flex>
          </Stack>
        </Flex>
      </VStack>
      <Divider w={'full'} mt={'33px'} mb={'20px'} borderColor={'grayModern.200'} />
      <Center>
        <HStack mx={'auto'}>
          <Text color={'grayModern.900'} fontSize={'16px'} fontWeight={'500'}>
            {t('Total Amount')}:{' '}
          </Text>
          <Text color={'brightBlue.600'} fontWeight={'500'} fontSize={'32px'}>
            {totalAmount}
          </Text>
          <CurrencySymbol type={currencyType} boxSize={'20px'}></CurrencySymbol>
          <Text color={'grayModern.900'} fontSize={'16px'} fontWeight={'500'}>
            /{t(CYCLE[config.usage.timeUnit])}
          </Text>
        </HStack>
      </Center>
    </TabPanel>
  );
}
