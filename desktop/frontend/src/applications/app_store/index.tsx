import { SelectTabData, SelectTabEvent, Tab, TabList, TabValue } from '@fluentui/react-components';
import { Search20Filled, DismissSquareRegular } from '@fluentui/react-icons';
import clsx from 'clsx';
import Image from 'next/image';
import { createContext, useContext, useState } from 'react';
import { EPageType, TAppStore } from './app_store_common';
import DetailPage from './detail_page';
import styles from './index.module.scss';
import MinePage from './mine_page';
import OrganizationPage from './organization_page';
import StorePage from './store_page';
import Icon from 'components/iconfont';

const ApppStoreContext = createContext({} as TAppStore);

export default function AppStore() {
  const [pageId, setPageId] = useState<TabValue>(EPageType.StorePage);
  const [detailAppName, setDetailAppName] = useState(' ');

  const toPage = function (pageId: EPageType, appName: string) {
    setPageId(pageId);
    setDetailAppName(appName);
  };
  const onTabSelect = (event: SelectTabEvent, data: SelectTabData) => {
    setPageId(data.value);
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
      <div className={clsx(styles.backgroundWrap, 'flex grow flex-col h-full')}>
        <div className="flex m-8 mb-6 justify-between">
          <TabList
            className={clsx(styles.tabList)}
            selectedValue={pageId}
            onTabSelect={onTabSelect}
          >
            <Tab value={EPageType.StorePage}>
              <div
                className={clsx(styles.defaultSpan, {
                  [styles.activeSpan]: pageId === EPageType.StorePage
                })}
              >
                发现
              </div>
            </Tab>
            <Tab value={EPageType.OrganizationPage}>
              <div
                className={clsx(styles.defaultSpan, {
                  [styles.activeSpan]: pageId === EPageType.OrganizationPage
                })}
              >
                组织
              </div>
            </Tab>
            <Tab value={EPageType.MinePage}>
              <div
                className={clsx(styles.defaultSpan, {
                  [styles.activeSpan]: pageId === EPageType.MinePage
                })}
              >
                我的
              </div>
            </Tab>
          </TabList>
          <div className={styles.inputSearch}>
            <Search20Filled />
            <div className="ml-2">
              <input className={styles.search} type="text" placeholder="发现镜像" />
            </div>
          </div>
        </div>
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
