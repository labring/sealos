/* eslint-disable @next/next/no-img-element */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import Iconfont from 'components/iconfont';
import MarkDown from 'components/markdown';
import { useEffect, useRef, useState } from 'react';
import request from 'services/request';
import useSessionStore from 'stores/session';
import { EPageType, formattedSize, handleImageName, TAppDetail } from './app_store_common';
import Button from './components/button';
import styles from './detail.module.scss';
import { useAppStoreContext } from './index';
import { CardLoading, ImageMarkdownLoading, ImageTagsLoading } from './components/imagehub_loading';
import { throttle } from 'lodash';

export default function DetailPage() {
  const { toPage, detailAppName } = useAppStoreContext();
  const appRef = useRef<HTMLDivElement>(null);
  const [isFixed, setFixed] = useState(false);
  const { kubeconfig } = useSessionStore((state) => state.getSession());
  const [selectTag, setSelectTag] = useState(handleImageName(detailAppName).tag);
  let fullImageName: string = handleImageName(detailAppName).name + ':' + selectTag;
  let imageCommand: string = 'sealos run ' + fullImageName;
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const handleScrollEvent = () => {
    const scrollTop = appRef.current?.scrollTop;
    setFixed(Boolean(scrollTop && scrollTop > 20));
  };

  useEffect(() => {
    appRef.current?.addEventListener('scroll', throttle(handleScrollEvent));
  }, []);

  const { data, isLoading, isSuccess } = useQuery(
    ['getAppDetail', fullImageName],
    async () => {
      const res = await request.post('/api/image_hub/get_detail', {
        kubeconfig,
        image_name: fullImageName
      });
      return res;
    },
    {
      onSuccess: (data) => {
        if (data.status === 201) {
          queryClient.invalidateQueries({ queryKey: ['getAppDetail', fullImageName] });
        }
      }
    }
  );

  let appDetail = {} as TAppDetail;
  if (data?.status === 200) {
    appDetail = data.data[0];
  }

  const handleCopy = (value: string) => {
    let timer: number;
    setOpen((s) => {
      if (!open) {
        timer = window.setTimeout(() => setOpen(false), 1000);
      } else {
        window.clearTimeout(timer);
      }
      return !s;
    });
    navigator.clipboard.writeText(value);
  };

  if (isLoading) {
    return (
      <div className={clsx(styles.backgroundWrap, 'flex flex-col grow h-full p-8 pb-0')}>
        <div className={clsx(styles.baseCard, styles.appHeader, 'w-full')}>
          <div
            className={clsx('cursor-pointer w-60')}
            onClick={() => toPage(EPageType.StorePage, '')}
          >
            <Iconfont iconName="icon-back2" color="#717D8A" />
          </div>
          <CardLoading width={400} height={110} />
        </div>
        <div className={clsx('flex grow my-4')}>
          <div ref={appRef} className={clsx(styles.baseCard, styles.mainLeft, 'py-8 px-6')}>
            <div className={clsx('flex items-center mb-4')}>
              <div className={styles.iconBtn}>
                <Iconfont iconName="icon-overview" color="#717D8A" />
              </div>
              <span className={styles.markdownTitle}>概览</span>
            </div>
            <ImageMarkdownLoading />
          </div>
          <div className={clsx(styles.baseCard, styles.mainRight, 'pt-8 px-6 flex flex-col')}>
            <div className={clsx('flex items-center')}>
              <div className={styles.iconBtn}>
                <Iconfont iconName="icon-tag" color="#717D8A" />
              </div>
              <div className={styles.markdownTitle}>Tags</div>
            </div>
            <ImageTagsLoading />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={clsx(styles.backgroundWrap, 'flex flex-col grow h-full p-8 pb-0')}>
      <div className={clsx(styles.baseCard, styles.appHeader, 'w-full')}>
        <div
          className={clsx('cursor-pointer w-60')}
          onClick={() => toPage(EPageType.StorePage, '')}
        >
          <Iconfont iconName="icon-back2" color="#717D8A" />
        </div>
        <div className={clsx(styles.appInfo, { [styles.fixed]: isFixed })}>
          <div className={clsx(styles.image, 'flex items-center justify-center shrink-0')}>
            <img
              src={appDetail?.icon ?? '/images/appstore/image_empty.svg'}
              alt={appDetail?.name}
            />
          </div>
          <div className={clsx(styles.appDesc)}>
            <div className={clsx(styles.title, 'flex items-center')}>
              <div>{fullImageName}</div>
              <div className={styles.fingerPrint}>
                <Iconfont iconName="icon-hash" color="#239BF2" />
                <span className={styles.imageId}>{appDetail?.ID?.substring(0, 12)}</span>
              </div>
            </div>
            <p className={styles.text}>{appDetail?.description}</p>
            {/* <div className={styles.installBtn}>
              <Button handleClick={() => {}} type="primary">
                安装 | {selectTag}
              </Button>
            </div> */}
            <div className={clsx(styles.imageLabels, 'flex space-x-4 mb-4')}>
              {appDetail?.keywords?.map((item) => {
                return (
                  <div key={item} className={clsx('cursor-pointer  px-4 ', styles.appLabels)}>
                    {item}
                  </div>
                );
              })}
            </div>
          </div>
          {/* <div className={styles.rightInfo}>
            <span className={styles.imageSizeText}> 19.1K </span>
            <span className="text-stone-500 text-xs mt-2">下载量</span>
          </div> */}
          <div className={clsx(styles.rightInfo, 'ml-4')}>
            <span className={styles.imageSizeText}>
              {appDetail.size ? formattedSize(appDetail.size) : 'empty'}
            </span>
            <span className="text-stone-500 text-xs mt-2">大小</span>
          </div>
          <div className={clsx(styles.fixedRightInfo)}>
            <span className={styles.imageSizeText}>
              {appDetail.size ? formattedSize(appDetail.size) : ''}
            </span>
          </div>
          {/* <div className={clsx(styles.fixedRightInfo)}>
            <Button handleClick={() => {}} type="primary">
              安装 | {selectTag}
            </Button>
          </div> */}
        </div>
      </div>
      <div className={clsx('flex grow my-4')}>
        <div
          ref={appRef}
          className={clsx(
            styles.baseCard,
            styles.mainLeft,
            styles.pageWrapperScroll,
            styles.hiddenScrollWrap
          )}
        >
          <div className="absolute w-full py-8 px-6">
            <div className={clsx('flex items-center mb-4')}>
              <div className={styles.iconBtn}>
                <Iconfont iconName="icon-overview" color="#717D8A" />
              </div>
              <span className={styles.markdownTitle}>概览</span>
            </div>
            {appDetail.type === 'cluster-image' ? (
              <div className={styles.appCommand}>
                <div className={styles.copyBtn} onClick={() => handleCopy(imageCommand)}>
                  <Iconfont iconName="icon-copy" />
                  <div className={clsx(styles.popover, open ? styles.active : '')}>copyed</div>
                </div>
                <div>{imageCommand}</div>
              </div>
            ) : null}
            <div className={styles.markDownWrap}>
              <MarkDown text={appDetail?.docs} isShowCopyBtn={false}></MarkDown>
            </div>
          </div>
        </div>
        <div className={clsx(styles.baseCard, styles.mainRight, 'pt-8 px-6 flex flex-col')}>
          <div className={clsx('flex items-center')}>
            <div className={styles.iconBtn}>
              <Iconfont iconName="icon-tag" color="#717D8A" />
            </div>
            <div className={styles.markdownTitle}>Tags</div>
          </div>
          <div className={clsx(styles.hiddenScrollWrap, 'grow my-4')}>
            <div className={clsx('absolute w-full space-y-2')}>
              {appDetail.tags?.map((item) => {
                return (
                  <div
                    key={item.name}
                    className={clsx(styles.tag, { [styles.activeTag]: selectTag === item.name })}
                    onClick={() => setSelectTag(item.name)}
                  >
                    <div className={clsx('w-8')}>
                      {selectTag === item.name && (
                        <Iconfont iconName="icon-checked" color="#239BF2" />
                      )}
                    </div>
                    <div>{item.name}</div>
                    <div className="ml-auto">{formattedSize(item.size)}</div>
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
