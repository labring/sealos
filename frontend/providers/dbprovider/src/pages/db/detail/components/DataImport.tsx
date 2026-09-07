import { DBDetailType } from '@/types/db';
import { Box, Button, Flex, Text } from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';
import { useState } from 'react';
import { MigrateTable } from './Migrate/Table';
import DumpImport from './DumpImport';
import useEnvStore from '@/store/env';
import { useRouter } from 'next/router';
import MyIcon from '@/components/Icon';

enum MenuType {
  DumpImport = 'DumpImport',
  InternetMigration = 'InternetMigration'
}

export default function DataImport({ db }: { db?: DBDetailType }) {
  if (!db) return null;

  const { t } = useTranslation();
  const [activeId, setActiveId] = useState(MenuType.InternetMigration);
  const { SystemEnv } = useEnvStore();
  const router = useRouter();

  if (db.dbType === 'redis') {
    return (
      <Flex h={'full'} alignItems={'center'} justifyContent={'center'} flexDirection={'column'}>
        <MyIcon name={'noEvents'} color={'transparent'} width={'36px'} height={'36px'} />
        <Text pt={'8px'} color={'grayModern.600'} fontSize={'14px'}>
          {t('data_import_unsupported_for_redis')}
        </Text>
      </Flex>
    );
  }

  return (
    <Flex flexDirection={'column'} h={'full'}>
      <Flex justifyContent={'space-between'} alignItems={'center'} mb={'16px'}>
        <Flex>
          {[
            { id: MenuType.InternetMigration, label: t('online_import') },
            ...(Boolean(SystemEnv.minio_url)
              ? [{ id: MenuType.DumpImport, label: t('import_through_file') }]
              : [])
          ].map((item) => (
            <Box
              key={item.label}
              mr={'16px'}
              pb={'6px'}
              pt={'4px'}
              borderBottom={'2px solid'}
              cursor={'pointer'}
              fontSize={'16px'}
              fontWeight={'500'}
              {...(item.id === activeId
                ? {
                    color: 'grayModern.900',
                    borderBottomColor: 'grayModern.900'
                  }
                : {
                    color: 'grayModern.600',
                    borderBottomColor: 'transparent',
                    onClick: () => {
                      setActiveId(item.id);
                    }
                  })}
            >
              {item.label}
            </Box>
          ))}
        </Flex>
        {activeId === MenuType.InternetMigration && (
          <Button
            height={'32px'}
            variant={'solid'}
            onClick={() => {
              router.push(`/db/migrate?name=${db?.dbName}&dbType=${db?.dbType}`);
            }}
          >
            {t('Migrate')}
          </Button>
        )}
      </Flex>
      {activeId === MenuType.InternetMigration && <MigrateTable dbName={db?.dbName || ''} />}
      {activeId === MenuType.DumpImport && <DumpImport db={db} />}
    </Flex>
  );
}
