import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Flex, Button, useTheme } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { useDBStore } from '@/store/db';
import { useToast } from '@/hooks/useToast';
import { useLoading } from '@/hooks/useLoading';
import { useGlobalStore } from '@/store/global';
import { serviceSideProps } from '@/utils/i18n';
import { useRouter } from 'next/router';
import Header from './components/Header';
import AppBaseInfo from './components/AppBaseInfo';
import Pods from './components/Pods';
import BackupTable, { type ComponentRef } from './components/BackupTable';
import { useTranslation } from 'next-i18next';
import { DBTypeEnum } from '@/constants/db';
import Monitor from './components/Monitor';
import dayjs from 'dayjs';

enum TabEnum {
  pod = 'pod',
  backup = 'backup',
  monitor = 'monitor'
}

const AppDetail = ({
  dbName,
  listType,
  dbType
}: {
  dbName: string;
  dbType: string;
  listType: `${TabEnum}`;
}) => {
  const BackupTableRef = useRef<ComponentRef>(null);
  const router = useRouter();
  const { t } = useTranslation();
  const listNav = useRef([
    { label: 'Monitor List', value: TabEnum.monitor },
    { label: 'Replicas List', value: TabEnum.pod },
    { label: 'Backup List', value: TabEnum.backup }
  ]);
  const theme = useTheme();
  const { toast } = useToast();
  const { Loading } = useLoading();
  const { screenWidth } = useGlobalStore();
  const isLargeScreen = useMemo(() => screenWidth > 1280, [screenWidth]);
  const { dbDetail, loadDBDetail, dbPods } = useDBStore();
  const [showSlider, setShowSlider] = useState(false);

  useQuery([dbName, 'loadDBDetail', 'intervalLoadPods'], () => loadDBDetail(dbName), {
    refetchInterval: 3000,
    onError(err) {
      router.replace('/dbs');
      toast({
        title: String(err),
        status: 'error'
      });
    }
  });

  return (
    <Flex flexDirection={'column'} height={'100vh'} bg={'#F3F4F5'} px={9} pb={4}>
      <Box>
        <Header db={dbDetail} setShowSlider={setShowSlider} isLargeScreen={isLargeScreen} />
      </Box>
      <Flex position={'relative'} flex={'1 0 0'} h={0}>
        <Box
          h={'100%'}
          flex={'0 0 400px'}
          mr={4}
          overflowY={'auto'}
          zIndex={9}
          transition={'0.4s'}
          bg={'white'}
          border={theme.borders.sm}
          borderRadius={'md'}
          {...(isLargeScreen
            ? {}
            : {
                w: '400px',
                position: 'absolute',
                left: 0,
                boxShadow: '7px 4px 12px rgba(165, 172, 185, 0.25)',
                transform: `translateX(${showSlider ? '0' : '-800px'})`
              })}
        >
          {dbDetail ? <AppBaseInfo db={dbDetail} /> : <Loading loading={true} fixed={false} />}
        </Box>
        <Flex
          flexDirection={'column'}
          flex={'1 0 0'}
          w={0}
          h={'100%'}
          bg={'white'}
          border={theme.borders.sm}
          borderRadius={'md'}
        >
          <Flex p={'26px'} alignItems={'flex-start'}>
            {listNav.current.map((item) => (
              <Box
                key={item.value}
                mr={5}
                pb={2}
                borderBottom={'2px solid'}
                cursor={'pointer'}
                fontSize={'lg'}
                {...(item.value === listType
                  ? {
                      color: 'black',
                      borderBottomColor: 'black'
                    }
                  : {
                      color: 'myGray.500',
                      borderBottomColor: 'transparent',
                      onClick: () =>
                        router.replace(
                          `/db/detail?name=${dbName}&dbType=${dbType}&listType=${item.value}`
                        )
                    })}
              >
                {t(item.label)}
              </Box>
            ))}
            <Box flex={1}></Box>
            {listType === TabEnum.pod && <Box color={'myGray.500'}>{dbPods.length} Items</Box>}
            {listType === TabEnum.backup && !BackupTableRef.current?.backupProcessing && (
              <Flex alignItems={'center'}>
                <Button
                  ml={3}
                  variant={'primary'}
                  onClick={() => {
                    if (dbDetail.dbType === DBTypeEnum.redis) {
                      return toast({
                        status: 'warning',
                        title: t('Redis does not support backup at this time')
                      });
                    }
                    BackupTableRef.current?.openBackup();
                  }}
                >
                  {t('Backup')}
                </Button>
              </Flex>
            )}
          </Flex>
          <Box flex={'1 0 0'} h={0}>
            {listType === TabEnum.pod && <Pods dbName={dbName} dbType={dbDetail.dbType} />}
            {listType === TabEnum.backup && <BackupTable ref={BackupTableRef} db={dbDetail} />}
            {listType === TabEnum.monitor && (
              <Monitor dbName={dbName} dbType={dbType} db={dbDetail} />
            )}
          </Box>
        </Flex>
      </Flex>
      {/* mask */}
      {!isLargeScreen && showSlider && (
        <Box
          position={'fixed'}
          top={0}
          left={0}
          right={0}
          bottom={0}
          onClick={() => setShowSlider(false)}
        />
      )}
    </Flex>
  );
};

export default AppDetail;

export async function getServerSideProps(context: any) {
  const dbName = context.query?.name || '';
  const dbType = context.query?.dbType || '';
  const listType = context.query?.listType || TabEnum.pod;

  return {
    props: { ...(await serviceSideProps(context)), dbName, listType, dbType }
  };
}
