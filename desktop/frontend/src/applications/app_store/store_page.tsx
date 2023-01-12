/* eslint-disable @next/next/no-img-element */
import { Spinner } from '@fluentui/react-components';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import Iconfont from 'components/iconfont';
import produce from 'immer';
import { useState } from 'react';
import request from 'services/request';
import useSessionStore from 'stores/session';
import {
  EPageType,
  formattedSize,
  handleImageName,
  ImagehubLabels,
  TImageLabels,
  getSelectLabels,
  TAppInfo,
  sortByName
} from './app_store_common';
import Button from './components/button';
import Labels from './components/labels';
import Error from './components/error';
import { useAppStoreContext } from './index';
import styles from './store_page.module.scss';
import { ListContextLoading } from './components/imagehub_loading';

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
        if (data.status === 201) {
          queryClient.invalidateQueries({ queryKey: ['getAppLists', selectedLabels] });
        }
      }
    }
  );
  let appLists: TAppInfo[] = [];
  if (data?.status === 200) {
    appLists = sortByName(data.data);
  }

  const handleLabelsChange = (value: string) => {
    setImageLabels(
      produce((draft: TImageLabels[]) => {
        const checkedItem = draft.find((item) => item.value === value);
        if (checkedItem) {
          checkedItem.checked = !checkedItem.checked;
        }
      })
    );
  };

  const handleLabelsClear = () => {
    setImageLabels(
      produce((draft: TImageLabels[]) => draft.forEach((item) => (item.checked = false)))
    );
  };

  return (
    <div className="grow flex">
      <div className={clsx(styles.labelsScrollWrap)}>
        <div className="absolute ml-8 pb-10">
          <Labels display="column" labels={imageLabels} onChange={handleLabelsChange} />
        </div>
      </div>
      <div className="flex flex-col ml-6 grow">
        <div className="flex items-center">
          <Labels
            display="row"
            labels={imageLabels.filter((item) => item.checked)}
            onChange={handleLabelsChange}
            onClear={handleLabelsClear}
          />
        </div>
        {isError && (
          <div className="w-full h-full flex justify-center items-center">
            <Error />
          </div>
        )}
        <div className={clsx(styles.pageWrapperScroll, styles.hiddenScrollWrap)}>
          {isLoading && <ListContextLoading />}
          {isSuccess && (
            <div className="absolute w-full space-y-4 pb-10">
              {appLists?.map((item: TAppInfo) => {
                return (
                  <div
                    key={item.name}
                    className={clsx(styles.appInfo, 'mr-8')}
                    onClick={() => toPage(EPageType.DetailPage, item.name)}
                  >
                    <div className="p-8 pl-6 flex items-center justify-center shrink-0">
                      <img
                        width={110}
                        height={110}
                        src={item?.icon ?? '/images/appstore/image_empty.svg'}
                        alt={item?.name}
                      />
                    </div>
                    <div className={clsx(styles.appDesc)}>
                      <div className={clsx(styles.title, 'pt-6 flex items-center')}>
                        <div>{handleImageName(item?.name).name}</div>
                        <div className={styles.fingerPrint}>
                          <Iconfont iconName="icon-hash" color="#239BF2" />
                        </div>
                      </div>
                      <div className={styles.description}>{item?.description}</div>
                      <div className={clsx('flex space-x-4 pt-4')}>
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
                    <div className="pr-10">
                      <div className="flex pt-6 space-x-2">
                        {/* <div className={clsx('w-20 h-20 text-right')}>
                          <div className={styles.imageSizeText}> 19.1K </div>
                          <span className="text-stone-500 text-xs pt-2">下载量</span>
                        </div> */}
                        <div className="w-20 h-20"></div>
                        <div className="w-20 h-20 text-right">
                          <div className={styles.imageSizeText}>
                            {item.size ? formattedSize(item.size) : 'empty'}
                          </div>
                          <span className="text-stone-500 text-xs pt-2">大小</span>
                        </div>
                      </div>
                      {/* <div className="flex justify-end mt-4">
                        <Button type="primary" size="medium" handleClick={() => {}}>
                          安装
                        </Button>
                      </div> */}
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
