'use client';
'use client';

import { Box, Flex, Grid, useTheme } from '@chakra-ui/react';
import { Tabs } from '@sealos/ui';
import { throttle } from 'lodash';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { useFormContext } from 'react-hook-form';

import MyIcon from '@/components/Icon';
import PriceBox from '@/components/PriceBox';
import QuotaBox from '@/components/QuotaBox';
import { useRouter } from '@/i18n';

import { useDevboxStore } from '@/stores/devbox';

import type { DevboxEditTypeV2 } from '@/types/devbox';
import { obj2Query } from '@/utils/tools';
import BasicConfiguration from './BasicConfiguration';
import NetworkConfiguration from './NetworkConfiguration';

const Form = ({
  pxVal,
  isEdit,
  countGpuInventory
}: {
  pxVal: number;
  isEdit: boolean;
  countGpuInventory: (type: string) => number;
}) => {
  const theme = useTheme();
  const router = useRouter();
  const t = useTranslations();
  const { watch } = useFormContext<DevboxEditTypeV2>();
  const navList: { id: string; label: string; icon: string }[] = [
    {
      id: 'baseInfo',
      label: t('basic_configuration'),
      icon: 'formInfo'
    },
    {
      id: 'network',
      label: t('Network Configuration'),
      icon: 'network'
    }
  ];

  const [activeNav, setActiveNav] = useState(navList[0].id);
  const { devboxList } = useDevboxStore();

  // listen scroll and set activeNav
  useEffect(() => {
    const scrollFn = throttle((e: Event) => {
      if (!e.target) return;
      const doms = navList.map((item) => ({
        dom: document.getElementById(item.id),
        id: item.id
      }));

      const dom = e.target as HTMLDivElement;
      const scrollTop = dom.scrollTop;
      for (let i = doms.length - 1; i >= 0; i--) {
        const offsetTop = doms[i].dom?.offsetTop || 0;

        if (scrollTop + 500 >= offsetTop) {
          setActiveNav(doms[i].id);
          break;
        }
      }
    }, 200);
    return () => {
      document.getElementById('form-container')?.removeEventListener('scroll', scrollFn);
    };
    // eslint-disable-next-line
  }, []);

  const boxStyles = {
    border: theme.borders.base,
    borderRadius: 'lg',
    mb: 4,
    bg: 'white'
  };

  return (
    <Grid
      height={'100%'}
      templateColumns={'220px 1fr'}
      gridGap={5}
      alignItems={'start'}
      pl={`${pxVal}px`}
    >
      {/* left sidebar */}
      <Box>
        <Tabs
          list={[
            { id: 'form', label: t('config_form') },
            { id: 'yaml', label: t('yaml_file') }
          ]}
          activeId={'form'}
          onChange={() =>
            router.replace(
              `/devbox/create?${obj2Query({
                type: 'yaml'
              })}`
            )
          }
        />
        <Box
          mt={3}
          borderRadius={'md'}
          overflow={'hidden'}
          backgroundColor={'white'}
          border={theme.borders.base}
          p={'4px'}
        >
          {navList.map((item) => (
            <Box
              key={item.id}
              onClick={() => {
                setActiveNav(item.id);
                window.location.hash = item.id;
              }}
            >
              <Flex
                borderRadius={'base'}
                cursor={'pointer'}
                gap={'8px'}
                alignItems={'center'}
                h={'40px'}
                _hover={{
                  backgroundColor: 'grayModern.100'
                }}
                color="grayModern.900"
                backgroundColor={activeNav === item.id ? 'grayModern.100' : 'transparent'}
              >
                <Box
                  w={'2px'}
                  h={'24px'}
                  justifySelf={'start'}
                  bg={'grayModern.900'}
                  borderRadius={'12px'}
                  opacity={activeNav === item.id ? 1 : 0}
                />
                <MyIcon
                  name={item.icon as any}
                  w={'20px'}
                  h={'20px'}
                  color={activeNav === item.id ? 'myGray.400' : 'grayModern.600'}
                />
                <Box>{item.label}</Box>
              </Flex>
            </Box>
          ))}
        </Box>
        <Box mt={3} overflow={'hidden'}>
          <QuotaBox />
        </Box>
        <Box mt={3} overflow={'hidden'}>
          <PriceBox
            components={[
              {
                cpu: watch('cpu'),
                memory: watch('memory'),
                nodeports: devboxList.length
              }
            ]}
          />
        </Box>
      </Box>
      {/* right content */}
      <Box
        id={'form-container'}
        pr={`${pxVal}px`}
        height={'100%'}
        position={'relative'}
        overflowY={'scroll'}
      >
        {/* base info */}
        <BasicConfiguration
          isEdit={isEdit}
          id={'baseInfo'}
          {...boxStyles}
          countGpuInventory={countGpuInventory}
        />
        {/* network */}
        <NetworkConfiguration isEdit={isEdit} id={'network'} {...boxStyles} />
      </Box>
    </Grid>
  );
};

export default Form;
