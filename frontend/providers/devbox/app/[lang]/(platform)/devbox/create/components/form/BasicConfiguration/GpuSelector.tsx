import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useFormContext } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { Box, Center, Flex } from '@chakra-ui/react';
import { MySelect, MyTooltip } from '@sealos/ui';

import Label from '../Label';
import { usePriceStore } from '@/stores/price';
import { DevboxEditTypeV2 } from '@/types/devbox';
import { GpuAmountMarkList } from '@/constants/devbox';
import { listOfficialTemplateRepository } from '@/api/template';

const labelWidth = 100;

export default function GpuSelector({
  countGpuInventory
}: {
  countGpuInventory: (type: string) => number;
}) {
  const t = useTranslations();
  const { sourcePrice } = usePriceStore();
  const { watch, setValue, getValues } = useFormContext<DevboxEditTypeV2>();
  const templateRepositoryQuery = useQuery(
    ['list-official-template-repository'],
    listOfficialTemplateRepository
  );

  const templateData = useMemo(
    () => templateRepositoryQuery.data?.templateRepositoryList || [],
    [templateRepositoryQuery.data]
  );
  const templateRepositoryUid = getValues('templateRepositoryUid');
  const isGpuTemplate = useMemo(() => {
    const template = templateData.find((item) => item.uid === templateRepositoryUid);
    return template?.templateRepositoryTags.some((item) => item.tag.name === 'gpu');
  }, [templateData, templateRepositoryUid]);

  const selectedGpu = () => {
    const selected = sourcePrice?.gpu?.find((item) => item.type === getValues('gpu.type'));
    if (!selected) return;
    return {
      ...selected,
      inventory: countGpuInventory(selected.type)
    };
  };

  // add NoGPU select item
  const gpuSelectList = useMemo(
    () =>
      sourcePrice?.gpu
        ? [
            {
              label: t('No GPU'),
              value: ''
            },
            ...sourcePrice.gpu.map((item) => ({
              icon: 'nvidia',
              label: (
                <Flex>
                  <Box color={'myGray.900'}>{item.alias}</Box>
                  <Box mx={3} color={'grayModern.900'}>
                    |
                  </Box>
                  <Box color={'grayModern.900'}>
                    {t('vm')} : {Math.round(item.vm)}G
                  </Box>
                  <Box mx={3} color={'grayModern.900'}>
                    |
                  </Box>
                  <Flex pr={3}>
                    <Box color={'grayModern.900'}>{t('Inventory')}&ensp;:&ensp;</Box>
                    <Box color={'#FB7C3C'}>{countGpuInventory(item.type)}</Box>
                  </Flex>
                </Flex>
              ),
              value: item.type
            }))
          ]
        : [],
    [countGpuInventory, t, sourcePrice?.gpu]
  );

  if (!isGpuTemplate || !sourcePrice?.gpu) {
    return null;
  }

  return (
    <Box mb={7}>
      <Flex alignItems={'center'}>
        <Label w={100}>GPU</Label>
        <MySelect
          width={'300px'}
          placeholder={t('No GPU') || ''}
          value={getValues('gpu.type')}
          list={gpuSelectList}
          onchange={(type: any) => {
            const selected = sourcePrice?.gpu?.find((item) => item.type === type);
            const inventory = countGpuInventory(type);
            if (type === '' || (selected && inventory > 0)) {
              setValue('gpu.type', type);
            }
          }}
        />
      </Flex>
      {!!watch('gpu.type') && (
        <Box mt={4} pl={`${labelWidth}px`}>
          <Box mb={1}>{t('Amount')}</Box>
          <Flex alignItems={'center'}>
            {GpuAmountMarkList.map((item) => {
              const inventory = selectedGpu()?.inventory || 0;

              const hasInventory = item.value <= inventory;

              return (
                <MyTooltip key={item.value} label={hasInventory ? '' : t('Under Stock')}>
                  <Center
                    mr={2}
                    w={'32px'}
                    h={'32px'}
                    borderRadius={'md'}
                    border={'1px solid'}
                    bg={'white'}
                    {...(getValues('gpu.amount') === item.value
                      ? {
                          borderColor: 'brightBlue.500',
                          boxShadow: '0px 0px 0px 2.4px rgba(33, 155, 244, 0.15)'
                        }
                      : {
                          borderColor: 'grayModern.200',
                          bgColor: 'grayModern.100'
                        })}
                    {...(hasInventory
                      ? {
                          cursor: 'pointer',
                          onClick: () => {
                            setValue('gpu.amount', item.value);
                          }
                        }
                      : {
                          cursor: 'default',
                          opacity: 0.5
                        })}
                  >
                    {item.label}
                  </Center>
                </MyTooltip>
              );
            })}
            <Box ml={3} color={'MyGray.500'}>
              / {t('Card')}
            </Box>
          </Flex>
        </Box>
      )}
    </Box>
  );
}
