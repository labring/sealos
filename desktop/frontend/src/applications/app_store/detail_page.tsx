/* eslint-disable @next/next/no-img-element */
import {
  ArrowLeft16Regular,
  ChevronDown24Regular,
  Tag16Filled,
  DocumentOnePage20Filled,
  Cloud16Filled
} from '@fluentui/react-icons';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import MarkDown from 'components/markdown';
import produce from 'immer';
import { useEffect, useRef, useState } from 'react';
import request from 'services/request';
import useSessionStore from 'stores/session';
import { EPageType, handleImageName, TAppDetail, TTag } from './app_store_common';
import Button from './components/button';
import Labels from './components/labels';
import styles from './detail.module.scss';
import { useAppStoreContext } from './index';

export default function DetailPage() {
  const { toPage, detailAppName } = useAppStoreContext();
  const appRef = useRef<HTMLDivElement>(null);
  const [isFixed, setFixed] = useState(false);
  const { kubeconfig } = useSessionStore((state) => state.getSession());
  const [appDetailStatus, setAppDetailStatus] = useState(false);
  const [appTags, setAppTags] = useState<TTag[]>();
  const [selectTag, setSelectTag] = useState('');

  const { data } = useQuery(
    ['getAppDetail'],
    async () => {
      const res = await request.post('/api/image_hub/get_detail', {
        kubeconfig,
        image_name: detailAppName
      });
      if (res.data.code === 200) {
        setAppDetailStatus(true);
      }
      return res;
    },
    {
      refetchInterval: appDetailStatus === false ? 2 * 1000 : false,
      enabled: appDetailStatus === false
    }
  );

  let appDetail = {} as TAppDetail;
  if (appDetailStatus) {
    appDetail = data?.data?.items[0];
  }

  const handleScrollEvent = () => {
    const scrollTop = appRef.current?.scrollTop;
    if (scrollTop && scrollTop > 20) {
      setFixed(true);
    } else {
      setFixed(false);
    }
  };

  const handleSelectTag = (tagName: string) => {
    setAppTags(
      produce((draft) => {
        const lastItem = draft?.find((item) => item.checked === true);
        if (lastItem) {
          lastItem.checked = false;
        }
        const selectItem = draft?.find((item) => item.name === tagName);
        if (selectItem) {
          setSelectTag(selectItem.name);
          selectItem.checked = true;
        }
      })
    );
  };

  useEffect(() => {
    appRef.current?.addEventListener('scroll', handleScrollEvent);
    if (appDetail.tags && appDetail.tags.length > 0) {
      setAppTags(
        produce(appDetail.tags, (draft) => {
          draft[0].checked = true;
        })
      );
      setSelectTag(appDetail.tags[0].name);
    }
  }, [appDetail.tags]);

  return (
    <div className={clsx(styles.backgroundWrap, 'flex flex-col grow h-full p-8 pb-0')}>
      <div className={clsx(styles.baseCard, styles.appHeader, 'w-full')}>
        <div
          className={clsx(styles.nav, 'cursor-pointer ')}
          onClick={() => toPage(EPageType.StorePage, '')}
        >
          <ArrowLeft16Regular />
        </div>
        <div className={clsx(styles.appInfo, isFixed && 'items-center')}>
          <div className="shrink-0 flex justify-center items-center">
            <img
              src={appDetail?.icon}
              alt={appDetail?.name}
              width={isFixed ? 60 : 110}
              height={isFixed ? 60 : 110}
            />
          </div>
          {isFixed ? (
            <>
              <div className={clsx(styles.title, 'ml-4')}>
                {handleImageName(appDetail?.name).name + ':' + selectTag}
              </div>
              <div className={clsx(styles.imageSizeText, 'ml-auto mr-6')}> 111MB </div>
              <Button handleClick={() => {}} type="primary">
                安装 | {selectTag}
              </Button>
            </>
          ) : (
            <>
              <div className={clsx(styles.appDesc)}>
                <div className={styles.title}>
                  {selectTag && handleImageName(appDetail?.name).name + ':' + selectTag}
                </div>
                <p className={styles.text}>{appDetail?.description}</p>
                <div className={'my-4'}>
                  <Button handleClick={() => {}} type="primary">
                    安装 | {selectTag}
                  </Button>
                </div>
                <div className={clsx('flex space-x-4 mb-4')}>
                  {appDetail?.keywords?.map((item) => {
                    return (
                      <div key={item} className={clsx('cursor-pointer  px-4 ', styles.appLabels)}>
                        {item}
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="flex flex-col shrink-0 mr-4 ml-8">
                <span className={styles.imageSizeText}> 19.1K </span>
                <span className="text-stone-500 text-xs mt-2">下载量</span>
              </div>
              <div className="flex flex-col shrink-0">
                <span className={styles.imageSizeText}> 111M</span>
                <span className="text-stone-500 text-xs mt-2">大小</span>
              </div>
            </>
          )}
        </div>
      </div>
      <div className={clsx('flex  grow my-4')}>
        <div
          ref={appRef}
          className={clsx(styles.baseCard, styles.mainLeft, styles.hiddenScrollWrap)}
        >
          <div className="absolute w-full pt-8 px-6 ">
            <div className={clsx('flex items-center mb-4')}>
              <div className={styles.iconBtn}>
                <DocumentOnePage20Filled primaryFill=" #717D8A" />
              </div>
              <span className={styles.markdownTitle}>概况</span>
            </div>
            <div className={styles.markDownWrap}>
              <MarkDown text={appDetail?.docs} isShowCopyBtn={false}></MarkDown>
            </div>
          </div>
        </div>
        <div className={clsx(styles.baseCard, styles.mainRight, styles.hiddenScrollWrap)}>
          <div className="absolute w-full pt-8 px-6 ">
            <div className={clsx('flex items-center mb-4')}>
              <div className={styles.iconBtn}>
                <Tag16Filled primaryFill=" #717D8A" />
              </div>
              <div className="text-lg ml-4 font-medium">Tags</div>
              <div></div>
            </div>
            <div className={clsx('w-full space-y-2')}>
              {appTags?.map((item) => {
                return (
                  <div
                    className={styles.tag}
                    key={item.name}
                    onClick={() => handleSelectTag(item.name)}
                  >
                    <div className={clsx('w-12', { 'opacity-0': !item.checked })}>
                      <ChevronDown24Regular />
                    </div>
                    <div>{item.name}</div>
                    <div className="ml-auto">size</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
