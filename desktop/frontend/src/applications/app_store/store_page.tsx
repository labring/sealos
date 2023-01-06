/* eslint-disable @next/next/no-img-element */
import { Spinner } from '@fluentui/react-components';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import Iconfont from 'components/iconfont';
import { useState } from 'react';
import request from 'services/request';
import useSessionStore from 'stores/session';
import {
  EPageType,
  formattedSize,
  handleImageName,
  ImagehubLabels,
  TImageLabels,
  getSelectLabels
} from './app_store_common';
import Button from './components/button';
import Labels from './components/labels';
import { useAppStoreContext } from './index';
import styles from './store_page.module.scss';

type TAppInfo = {
  icon: string;
  keywords: string[];
  name: string;
  description?: string;
  size: number;
};

function StorePage() {
  const { toPage } = useAppStoreContext();
  const [imageLabels, setImageLabels] = useState<TImageLabels[]>(ImagehubLabels);
  const { kubeconfig } = useSessionStore((state) => state.getSession());

  const selectedLabels = getSelectLabels(imageLabels);
  const queryClient = useQueryClient();

  const { data, isLoading, isSuccess, isError } = useQuery(
    ['getAppLists', selectedLabels],
    async () => {
      const res = await request.post('/api/image_hub/get_list', {
        kubeconfig,
        labels: selectedLabels
      });
      return res;
    },
    {
      onSuccess: (data) => {
        if (data.data.code === 201) {
          queryClient.invalidateQueries({ queryKey: ['getAppLists', selectedLabels] });
        }
      }
    }
  );
  const appLists = data?.data?.items as TAppInfo[];

  return (
    <div className="grow flex">
      <div className={clsx(styles.labelsScrollWrap)}>
        <div className="absolute ml-8 pb-10">
          <Labels display="column" labels={imageLabels} setLabelsFunction={setImageLabels} />
        </div>
      </div>
      <div className="flex flex-col ml-6 grow">
        <div className="flex items-center ">
          <Labels display="row" labels={imageLabels} setLabelsFunction={setImageLabels} />
        </div>
        {isLoading && (
          <div className="w-full h-full flex justify-center items-center">
            <Spinner />
          </div>
        )}
        <div className={clsx(styles.pageWrapperScroll, styles.hiddenScrollWrap)}>
          {isSuccess && (
            <div className="absolute w-full space-y-4 pb-10">
              {appLists?.map((item: TAppInfo) => {
                return (
                  <div
                    key={item.name}
                    className={clsx(styles.appInfo, 'mr-8')}
                    onClick={() => toPage(EPageType.DetailPage, item.name)}
                  >
                    <div className="p-8 flex items-center justify-center shrink-0">
                      <img width={110} height={110} src={item?.icon} alt={item?.name} />
                    </div>
                    <div className={clsx(styles.appDesc)}>
                      <div className={clsx(styles.title, 'pt-6 flex items-center')}>
                        <div>{handleImageName(item?.name).name}</div>
                        <div className={styles.fingerPrint}>
                          <Iconfont iconName="icon-hash" />
                        </div>
                      </div>
                      <p className={styles.appDescText}>{item?.description}</p>
                      <div className={clsx('flex space-x-4 mb-4')}>
                        {item?.keywords?.map((item) => {
                          return (
                            <div
                              key={item}
                              className={clsx('cursor-pointer  px-4 ', styles.appLabels)}
                            >
                              {item}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div className=" pr-8">
                      <div className="flex">
                        <div className={clsx('w-20 h-20 ml-6 pt-6')}>
                          <div className={styles.imageSizeText}> 19.1K </div>
                          <span className="text-stone-500 text-xs">下载量</span>
                        </div>
                        <div className={styles.border1px}> </div>
                        <div className="w-20 h-20 pt-6 pr-6">
                          <div className={styles.imageSizeText}>
                            {item.size ? formattedSize(item.size) : 'empty'}
                          </div>
                          <span className="text-stone-500 text-xs">大小</span>
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
