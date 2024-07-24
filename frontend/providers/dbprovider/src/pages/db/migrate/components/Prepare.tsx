import CodeBlock from '@/components/CodeBlock';
import { SupportMigrationDBType } from '@/types/db';
import { MigrateForm } from '@/types/migrate';
import { Box, Checkbox, Text } from '@chakra-ui/react';
import { useMemo, useState } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { useTranslation } from 'next-i18next';

export default function PrepareBox({
  migrationType,
  formHook
}: {
  migrationType: SupportMigrationDBType;
  formHook: UseFormReturn<MigrateForm, any>;
}) {
  if (!formHook || !migrationType) return <></>;
  const { t } = useTranslation();

  const content = useMemo(() => {
    const contentConfig: Record<
      SupportMigrationDBType,
      {
        codeList: string[];
        permissionCheck: string;
        title: string;
        checkboxLabel: string;
      }
    > = {
      'apecloud-mysql': {
        codeList: [
          t('migrate.mysql.stepOne'),
          "show global variables like 'binlog%'; ",
          'set global binlog_format=ROW;  ',
          t('migrate.mysql.stepTwo'),
          "show variables like '%row_im%';  ",
          "set binlog_row_image ='FULL';  "
        ],
        checkboxLabel: t('migration_preparations'),
        permissionCheck: `source account: REPLICATION SLAVE、REPLICATION CLIENT、SELECT \nsink account: SELECT、INSERT、UPDATE、DELETE、CREATE、ALTER、DROP`,
        title: 'MySQL'
      },
      mongodb: {
        codeList: [t('migrate.mongodb.stepOne'), t('migrate.mongodb.stepTwo')],
        checkboxLabel: t('migration_preparations'),
        permissionCheck: t('migrate.mongo.check'),
        title: 'Monogo'
      },
      postgresql: {
        codeList: [
          t('migrate.postgresql.stepOne'),
          `SHOW wal_level;`,
          `ALTER SYSTEM SET wal_level = 'logical';`,
          t('migrate.postgresql.stepTwo')
        ],
        checkboxLabel: t('migration_preparations'),
        permissionCheck: t('migrate.postgresql.check'),
        title: 'PostgreSQL'
      }
    };

    return contentConfig[migrationType];
  }, [migrationType, t]);

  return (
    <Box>
      <Text fontSize={'16px'} fontWeight={500} color={'#24282C'}>
        {content.title} {t('migrate_config')}
      </Text>
      <CodeBlock
        flexStyle={{
          mt: '14px'
        }}
        codeList={content.codeList}
      />
      <Text mt="20px" fontSize={'16px'} fontWeight={500} color={'#24282C'}>
        {content.title} {t('migration_permission_check')}
      </Text>
      <Text mt="14px" fontSize={'12px'} fontWeight={400} color={'#24282C'} whiteSpace={'pre'}>
        {content.permissionCheck}
      </Text>
      <Text mt="20px" fontSize={'16px'} fontWeight={500} color={'#24282C'}>
        {t('covering_risks')}
      </Text>
      <Text mt="14px" fontSize={'12px'} fontWeight={400} color={'#24282C'}>
        {t('important_tips_for_migrating')}
      </Text>

      <Checkbox
        isInvalid={!!formHook?.formState?.errors?.isChecked}
        mt="16px"
        {...formHook.register('isChecked', {
          required: true
        })}
      >
        <Text color={!!formHook?.formState?.errors?.isChecked ? '#E53E3E' : '#1D8CDC'}>
          {content.checkboxLabel}
        </Text>
      </Checkbox>
    </Box>
  );
}
