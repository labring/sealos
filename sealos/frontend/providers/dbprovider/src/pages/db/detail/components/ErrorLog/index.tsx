import { LogTypeEnum } from '@/constants/log';
import { DBDetailType, SupportReconfigureDBType } from '@/types/db';
import { I18nCommonKey } from '@/types/i18next';
import { Box, Flex } from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import React, { ForwardedRef, forwardRef, useEffect, useMemo, useState } from 'react';
import RunTimeLog from './RunTimeLog';

export type ComponentRef = {
  openBackup: () => void;
};

const DB_LOG_TYPES: Record<SupportReconfigureDBType, LogTypeEnum[]> = {
  postgresql: [LogTypeEnum.RuntimeLog],
  mongodb: [LogTypeEnum.RuntimeLog],
  'apecloud-mysql': [LogTypeEnum.ErrorLog, LogTypeEnum.SlowQuery],
  redis: [LogTypeEnum.RuntimeLog]
};

const ErrorLog = ({ db }: { db?: DBDetailType }, ref: ForwardedRef<ComponentRef>) => {
  if (!db) return <></>;

  const { t } = useTranslation();

  const router = useRouter();
  const [subMenu, setSubMenu] = useState<LogTypeEnum>(LogTypeEnum.RuntimeLog);

  const parsedSubMenu = useMemo(() => {
    const parseSubMenu = (subMenu: string): LogTypeEnum => {
      if (Object.values(LogTypeEnum).includes(subMenu as LogTypeEnum)) {
        return subMenu as LogTypeEnum;
      }

      const dbType = db?.dbType as SupportReconfigureDBType;
      const availableMenus = DB_LOG_TYPES[dbType] || [];

      if (availableMenus.includes(LogTypeEnum.ErrorLog)) {
        return LogTypeEnum.ErrorLog;
      }

      return LogTypeEnum.RuntimeLog;
    };

    return parseSubMenu(router.query.subMenu as string);
  }, [router.query.subMenu, db?.dbType]);

  useEffect(() => {
    setSubMenu(parsedSubMenu);
  }, [parsedSubMenu]);

  const updateSubMenu = (newSubMenu: LogTypeEnum) => {
    setSubMenu(newSubMenu);
    router.push({
      query: { ...router.query, subMenu: newSubMenu }
    });
  };

  const { filteredSubNavList } = useMemo(() => {
    const SubNavList = [
      { label: t('error_log.runtime_log'), value: LogTypeEnum.RuntimeLog },
      { label: t('error_log.error_log'), value: LogTypeEnum.ErrorLog },
      { label: t('error_log.slow_query'), value: LogTypeEnum.SlowQuery }
    ];

    const availableSubMenus = DB_LOG_TYPES[db.dbType as SupportReconfigureDBType] || [];
    const filteredSubNavList = SubNavList.filter((item) => availableSubMenus.includes(item.value));

    return {
      availableSubMenus,
      filteredSubNavList
    };
  }, [t, db.dbType]);

  return (
    <Flex flexDirection={'column'} h={'full'} w={'full'} position={'relative'}>
      {db && (
        <RunTimeLog
          key={`${subMenu}-${db.dbType}`}
          db={db}
          logType={subMenu}
          filteredSubNavList={filteredSubNavList}
          updateSubMenu={updateSubMenu}
        />
      )}
    </Flex>
  );
};

export default React.memo(forwardRef(ErrorLog));
