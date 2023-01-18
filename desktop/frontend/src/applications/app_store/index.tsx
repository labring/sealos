import { TabValue } from '@fluentui/react-components';
import clsx from 'clsx';
import { createContext, useContext, useState } from 'react';
import { EPageType, TAppStore } from './app_store_common';
import DetailPage from './detail_page';
import styles from './index.module.scss';
import MinePage from './mine_page';
import OrganizationPage from './organization_page';
import StorePage from './store_page';

const ApppStoreContext = createContext({} as TAppStore);

export default function AppStore() {
  const [pageId, setPageId] = useState<TabValue>(EPageType.StorePage);
  const [detailAppName, setDetailAppName] = useState(' ');

  const toPage = function (pageId: EPageType, appName: string) {
    setPageId(pageId);
    setDetailAppName(appName);
  };

  if (pageId === EPageType.DetailPage) {
    return (
      <ApppStoreContext.Provider value={{ toPage, detailAppName }}>
        <DetailPage />
      </ApppStoreContext.Provider>
    );
  }

  return (
    <ApppStoreContext.Provider value={{ toPage, detailAppName }}>
      <div className={clsx(styles.backgroundWrap, 'flex grow flex-col h-full pt-6 pl-6')}>
        {pageId === EPageType.StorePage && <StorePage />}
        {pageId === EPageType.OrganizationPage && <OrganizationPage />}
        {pageId === EPageType.MinePage && <MinePage />}
      </div>
    </ApppStoreContext.Provider>
  );
}

export function useAppStoreContext() {
  return useContext(ApppStoreContext);
}
