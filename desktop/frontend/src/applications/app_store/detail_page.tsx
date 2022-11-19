/* eslint-disable @next/next/no-img-element */
import React, { useState, useEffect } from 'react';
import useAppStore, { TApp } from 'stores/app';
import request from 'services/request';
import { Spinner, Button, Popover, PopoverSurface, PopoverProps } from '@fluentui/react-components';
import Icon from 'components/icons';
import Markdown from 'components/markdown';
import styles from './detail.module.scss';
import clsx from 'clsx';
import { useQuery } from '@tanstack/react-query';

export type TAppDetail = {
  currentVersionInfo: {
    version: string;
    sha: string;
    supportProcessor: string;
    memory: string;
  };
  // all of the versions
  versions: string[];
  // install command
  installGuide: string[];
  // the readme file of the current version
  currentReadme: string;
};

const DetailPage = ({
  action,
  app
}: {
  action: (param: { page: string; appIdentifier?: string }) => void;
  app: TApp;
}) => {
  const { installedApps, installApp, openApp } = useAppStore(
    ({ installedApps, installApp, openApp }) => ({ installedApps, installApp, openApp })
  );
  const { isLoading, data } = useQuery(['getAppDetailInfo'], () => getAppDetail(app));
  const [dstate, setDown] = useState(0);
  const [appDetail, setAppDetail] = useState<TAppDetail>();
  const [open, setOpen] = React.useState(false);
  const [target, setTarget] = React.useState<HTMLElement | null>(null);

  const onOpenChange: PopoverProps['onOpenChange'] = (e, data) => {
    // handle custom trigger interactions separately
    if (e.target !== target) {
      setOpen(data.open);
    }
  };

  useEffect(() => {
    setAppDetail(data);
  }, [data]);

  const stars = geneStar(app);
  const reviews = geneStar(app, 1);
  const { currentVersionInfo, installGuide = [], versions = [], currentReadme } = appDetail || {};
  const download = () => {
    setDown(1);
    window.setTimeout(() => {
      installApp(app);
      setDown(3);
    }, 3000);
  };

  const refresh = () => window.location.reload();
  const openThisApp = () => {
    openApp(app);
  };
  const copyContent = () => {
    let timer: number;
    setOpen((s) => {
      if (!open) {
        timer = window.setTimeout(() => setOpen(false), 1000);
      } else {
        window.clearTimeout(timer);
      }
      return !s;
    });
    navigator.clipboard.writeText(installGuide.join('\n'));
  };
  const changeVersion = async (v: string) => {
    if (v !== currentVersionInfo?.version) {
      const res = await getAppDetail(app, v);
      // mock change
      if (appDetail?.currentVersionInfo.version && v !== appDetail?.currentVersionInfo.version) {
        res.currentVersionInfo.version = v;
      }
      setAppDetail(res);
    }
  };

  useEffect(() => {
    if (installedApps.find((item) => item.icon === app.icon)) setDown(3);
  }, [dstate, app.icon, installedApps]);

  if (isLoading) {
    return <Spinner size={'large'} />;
  }
  return (
    <div className={clsx(styles.detailpage, ' w-full flex p-12 pt-6 mt-8')}>
      <div className="absolute text-3xl">
        <Icon
          fafa="faArrowLeft"
          onClick={() => {
            action({ page: 'page1' });
          }}
        >
          back
        </Icon>
      </div>
      <div className={styles.detailcont}>
        <img alt="" className="rounded" width={100} height={100} src={app.icon} />
        <div className="flex flex-col items-center text-center relative">
          <div className="text-2xl font-semibold mt-6">{app.name}</div>
          <div className="text-xs text-blue-500">Community</div>
          {dstate == 0 ? (
            <div className={clsx(styles.instbtn, ' mt-12 mb-8 handcr')} onClick={download}>
              Get
            </div>
          ) : null}
          {dstate == 1 ? <div className={clsx(styles.downbar, ' mt-12 mb-8')}></div> : null}
          {dstate == 2 ? (
            <div className={clsx(styles.instbtn, ' mt-12 mb-8 handcr')} onClick={refresh}>
              Refresh
            </div>
          ) : null}
          {dstate == 3 ? (
            <div className={clsx(styles.instbtn, ' mt-12 mb-8 handcr')} onClick={openThisApp}>
              Open
            </div>
          ) : null}
          <div className="flex mt-4">
            <div>
              <div className="flex items-center text-sm font-semibold">
                {stars}
                <Icon className="text-orange-600 ml-1" fafa="faStar" width={14} />
              </div>
              <span className="text-xss">Average</span>
            </div>
            <div className="w-px bg-gray-300 mx-4"></div>
            <div>
              <div className="text-sm font-semibold">{Math.round(reviews / 100) / 10}K</div>
              <div className="text-xss mt-px pt-1">Ratings</div>
            </div>
          </div>
          <div className={clsx(styles.descnt, ' text-xs relative w-0')}>{app.data.desc}</div>
        </div>
      </div>
      <div className={clsx(styles.growcont, ' flex flex-row ')}>
        <div className={clsx(styles.detailinfo, 'pl-8 pr-10')}>
          <div className={clsx(styles.infobrief, 'flex flex-row flex-wrap')}>
            <div className="border bg-white px-5 py-2 mt-8">{currentVersionInfo?.version}</div>
            <div className="border ml-5 bg-white px-5 py-2 mt-8">{currentVersionInfo?.sha}</div>
            <div className="border ml-5 bg-white px-5 py-2 mt-8">
              {currentVersionInfo?.supportProcessor}
            </div>
            <div className="border ml-5 bg-white px-5 py-2 mt-8">{currentVersionInfo?.memory}</div>
          </div>

          <div
            ref={setTarget}
            className={clsx(
              styles.codebg,
              'inline-flex flex-col pl-5 py-2 pr-72 my-12 cursor-pointer'
            )}
            onClick={() => copyContent()}
          >
            {installGuide?.map((item) => (
              <div className="text-white" key={item}>
                {' '}
                {item}
              </div>
            ))}
          </div>
          <Popover
            appearance="inverted"
            positioning={{ target }}
            open={open}
            onOpenChange={onOpenChange}
          >
            <PopoverSurface>copied!</PopoverSurface>
          </Popover>
          <div className={clsx(styles.highlight, 'mt-8, p-5')}>
            <Markdown text={currentReadme ?? ''} />
          </div>
        </div>
        <div className={clsx(styles.detailversions, 'flex flex-col mt-8')}>
          {versions.map((item) => (
            <Button
              onClick={() => changeVersion(item)}
              appearance={item === currentVersionInfo?.version ? 'primary' : undefined}
              key={item}
            >
              {item}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
};

const geneStar = (item: TApp, rv = 0) => {
  var url = item.data.url,
    stars = 0;

  for (var i = 0; i < url.length; i++) {
    if (rv) stars += url[i].charCodeAt(0) / (i + 3);
    else stars += url[i].charCodeAt(0) / (i + 2);
  }

  if (rv) {
    stars = stars % 12;
    stars = Math.round(stars * 1000);
  } else {
    stars = stars % 4;
    stars = Math.round(stars * 10) / 10;
  }

  return 1 + stars;
};

// 获取应用的详情

const getAppDetail = async (app: TApp, version: string = 'latest') => {
  const res = await request('/api/desktop/getAppDetail', {
    data: {
      app,
      version
    }
  });
  return res?.data || {};
};

export default DetailPage;
