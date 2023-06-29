import React, { useMemo, useCallback, useState } from 'react';
import { Box, Flex, Tooltip, Button } from '@chakra-ui/react';
import type { DBDetailType } from '@/types/db';
import { useCopyData, printMemory } from '@/utils/tools';
import MyIcon from '@/components/Icon';
import { getDBSecret } from '@/api/db';
import { useQuery } from '@tanstack/react-query';
import { DBStatusEnum, DBTypeEnum, defaultDBDetail } from '@/constants/db';
import { sealosApp } from 'sealos-desktop-sdk/app';
import { useTranslation } from 'next-i18next';

const AppBaseInfo = ({ db = defaultDBDetail }: { db: DBDetailType }) => {
  const { t } = useTranslation();
  const { copyData } = useCopyData();
  const [showSecret, setShowSecret] = useState(false);

  const { data: secret } = useQuery(['getDBSecret', db.id], () =>
    db.id ? getDBSecret({ dbName: db.dbName, dbType: db.dbType }) : null
  );

  const appInfoTable = useMemo<
    {
      name: string;
      iconName: string;
      items: {
        label: string;
        value?: string;
        copy?: string;
      }[];
    }[]
  >(
    () => [
      {
        name: 'Basic Info',
        iconName: 'info',
        items: [
          { label: 'Creation Time', value: db.createTime },
          { label: 'DataBase Type', value: db.dbType },
          { label: 'DataBase Version', value: db.dbVersion }
        ]
      },
      {
        name: 'Config Info',
        iconName: 'settings',
        items: [
          { label: 'Limit CPU', value: `${db.cpu / 1000} Core` },
          {
            label: 'Limit Memory',
            value: printMemory(db.memory)
          },
          { label: 'Storage', value: `${db.storage}Gi` }
        ]
      }
    ],
    [db]
  );

  const onclickConnectDB = useCallback(() => {
    if (!secret) return;
    const commandMap = {
      [DBTypeEnum.postgresql]: `psql '${secret.connection}'`,
      [DBTypeEnum.mongodb]: `mongosh '${secret.connection}'`,
      [DBTypeEnum.mysql]: `mysql -h ${secret.host} -P ${secret.port} -u ${secret.username} -p${secret.password}`
    };

    const defaultCommand = commandMap[db.dbType];

    sealosApp.runEvents('openDesktopApp', {
      appKey: 'system-terminal',
      query: {
        defaultCommand
      },
      messageData: { type: 'new terminal', command: defaultCommand }
    });
  }, [db.dbType, secret]);

  return (
    <Box px={5} py={7} position={'relative'}>
      {appInfoTable.map((info) => (
        <Box
          _notFirst={{
            mt: 6
          }}
          key={info.name}
        >
          <Flex alignItems={'center'} color={'myGray.500'}>
            <MyIcon w={'16px'} name={info.iconName as any}></MyIcon>
            <Box ml={2}>{t(info.name)}</Box>
          </Flex>
          <Box mt={3} p={4} backgroundColor={'myWhite.400'} borderRadius={'sm'}>
            {info.items.map((item, i) => (
              <Flex
                key={item.label || i}
                flexWrap={'wrap'}
                _notFirst={{
                  mt: 4
                }}
              >
                <Box flex={'0 0 110px'} w={0} color={'blackAlpha.800'}>
                  {t(item.label)}
                </Box>
                <Box
                  color={'blackAlpha.600'}
                  flex={'1 0 0'}
                  textOverflow={'ellipsis'}
                  overflow={'hidden'}
                  whiteSpace={'nowrap'}
                >
                  <Tooltip label={item.value}>
                    <Box
                      as="span"
                      cursor={!!item.copy ? 'pointer' : 'default'}
                      onClick={() => item.value && !!item.copy && copyData(item.copy)}
                    >
                      {item.value}
                    </Box>
                  </Tooltip>
                </Box>
              </Flex>
            ))}
          </Box>
        </Box>
      ))}
      {/* secret */}
      {secret && db.status.value === DBStatusEnum.Running && (
        <>
          <Flex mt={6} alignItems={'center'} color={'myGray.500'}>
            <MyIcon w={'16px'} name={'connection'}></MyIcon>
            <Box ml={2}>{t('Connection Info')}</Box>
            <Button
              ml={3}
              size={'xs'}
              disabled={db.status.value !== DBStatusEnum.Running}
              onClick={onclickConnectDB}
            >
              {t('Direct Connection')}
            </Button>
          </Flex>
          <Box
            mt={3}
            p={4}
            backgroundColor={'myWhite.400'}
            borderRadius={'sm'}
            position={'relative'}
          >
            <Button
              position={'absolute'}
              right={'10px'}
              top={'10px'}
              variant={'unstyled'}
              onClick={() => setShowSecret(!showSecret)}
            >
              <MyIcon
                name={showSecret ? 'read' : 'unread'}
                w={'26px'}
                color={'myGray.600'}
              ></MyIcon>
            </Button>
            {Object.entries(secret).map(([name, value]) => (
              <Box
                key={name}
                _notFirst={{
                  mt: 4
                }}
              >
                <Box color={'myGray.500'}>{name}</Box>
                <Box color={'myGray.800'}>
                  <Box as="span" cursor={'pointer'} onClick={() => copyData(value)}>
                    {showSecret ? value : '***********'}
                  </Box>
                </Box>
              </Box>
            ))}
          </Box>
        </>
      )}
    </Box>
  );
};

export default AppBaseInfo;
