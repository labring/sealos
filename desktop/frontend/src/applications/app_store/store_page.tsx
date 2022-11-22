/* eslint-disable @next/next/no-img-element */
import { Spinner } from '@fluentui/react-components';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import produce from 'immer';
import { useEffect, useState } from 'react';
import request from 'services/request';
import useSessionStore from 'stores/session';
import { EPageType, handleImageName, imagehubLabels } from './app_store_common';
import Button from './components/button';
import Labels from './components/labels';
import { useAppStoreContext } from './index';
import styles from './store_page.module.scss';

type TImageLabels = {
  label: string;
  value: string;
  checked: boolean;
};

type TAppInfo = {
  icon: string;
  keywords: string[];
  name: string;
  desc?: string;
};

function StorePage() {
  const { toPage } = useAppStoreContext();
  const [imageLabels, setImageLabels] = useState<TImageLabels[]>(imagehubLabels);
  const { kubeconfig } = useSessionStore((state) => state.getSession());
  const [appListStatus, setAppListStatus] = useState(false);
  const [selectedLabels, setSelectedLabels] = useState('');

  const { data, isLoading, isSuccess } = useQuery(
    ['getAppLists'],
    async () => {
      const res = await request.post('/api/image_hub/get_list', {
        kubeconfig,
        labels: selectedLabels
      });
      return res;
    },
    {
      refetchInterval: appListStatus === false ? 2 * 1000 : false,
      enabled: appListStatus === false,
      onSuccess: (data) => {
        if (data.data.code === 200) {
          setAppListStatus(true);
        }
      }
    }
  );

  const appLists = data?.data?.items as TAppInfo[];

  const handleClick = (value: string) => {
    if (value === 'All') {
      setImageLabels(
        produce((draft) => {
          const notCheckAll = draft.every((item) => item.checked === true);
          if (notCheckAll) {
            draft.forEach((item) => (item.checked = false));
          } else {
            draft.forEach((item) => (item.checked = true));
          }
        })
      );
    }
    setImageLabels(
      produce((draft) => {
        const checkedItem = draft.find((item) => item.value === value);
        if (checkedItem) {
          checkedItem.checked = !checkedItem?.checked;
        }
        const checkAll = draft.some((item) => item.checked === true);
        if (checkAll) {
          draft[0].checked = true;
        }
        const notCheckAll = draft.slice(1).every((item) => item.checked === false);
        if (notCheckAll) {
          draft[0].checked = false;
        }
      })
    );
  };

  useEffect(() => {
    let temp = imageLabels.filter((item) => item.checked === true).slice(1);
    let select: string[] = [];
    if (temp.length > 0) {
      select = temp.map((item) => 'keyword.imagehub.sealos.io/' + item.value);
    }
    setAppListStatus(false);
    setSelectedLabels(select.join(','));
  }, [imageLabels]);

  return (
    <div className="grow flex">
      <div className="ml-8">
        <Labels display="column" labels={imageLabels} handleClick={handleClick} />
      </div>
      <div className="flex flex-col ml-6 grow">
        <div className="flex items-center ">
          <Labels display="row" labels={imageLabels} handleClick={handleClick} />
        </div>
        {isLoading && (
          <div className="w-full h-full flex justify-center items-center">
            <Spinner />
          </div>
        )}
        <div className={clsx(styles.pageWrapperScroll, styles.hiddenScrollWrap)}>
          {isSuccess && (
            <div className="space-y-4 w-full  absolute">
              {appLists?.map((item: TAppInfo) => {
                return (
                  <div
                    key={item.name}
                    className={clsx(styles.appInfo, 'mr-8')}
                    onClick={() => toPage(EPageType.DetailPage, item.name)}
                  >
                    <div className=" p-8 flex items-center justify-center shrink-0">
                      <img src={item.icon} alt={item.name} width={110} height={110} />
                    </div>
                    <div className={clsx(styles.appDesc)}>
                      <div className="pt-6 text-2xl"> {handleImageName(item?.name).name} </div>
                      <p className={styles.appDescText}>{item?.desc}</p>
                      <div className={clsx('mb-4')}>
                        <Labels
                          display="appLabel"
                          handleClick={() => {}}
                          labels={[]}
                          appLabels={item.keywords}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex">
                        <div className={clsx('w-20 h-20 ml-6 pt-6')}>
                          <span className="text-stone-500 text-xs">下载量</span>
                          <span> 19.1K </span>
                        </div>
                        <div className={styles.border1px}> </div>
                        <div className="w-20 h-20  pt-6  pr-6">
                          <span className="text-stone-500 text-xs">大小</span>
                          <span> 111M</span>
                        </div>
                      </div>
                      <div className="flex justify-center mt-4">
                        <Button type="primary" size="medium" handleClick={() => {}}>
                          安装
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default StorePage;
