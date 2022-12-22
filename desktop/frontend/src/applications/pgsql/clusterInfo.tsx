import { Popover, PopoverSurface, PositioningImperativeRef } from '@fluentui/react-components';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import Image from 'next/image';
import { useRef, useState } from 'react';
import request from 'services/request';
import useSessionStore from 'stores/session';
import { formatTime } from 'utils/format';
import styles from './clusterInfo.module.scss';
import Button from './components/button';
import { TPgsqlDetail } from './pgsql_common';
import PgsqlStatus from './pgsql_status';

type TInfoData = {
  label: string;
  value: string | number;
};

type TInfoCard = {
  infoDatas?: TInfoData[];
  headerDatas?: string[];
  customContent?: {
    label: string;
    value: string;
    customRef: any;
    onCopy: () => void;
  };
};

function InfoCard(props: TInfoCard) {
  const { infoDatas, headerDatas, customContent } = props;
  return (
    <div className={clsx(styles.clusterInfoCard, 'space-y-2')}>
      {headerDatas && (
        <div className="border-b h-10">
          {headerDatas.map((item) => {
            return (
              <span className="w-1/2 inline-block" key={item}>
                {item}
              </span>
            );
          })}
        </div>
      )}
      {customContent && (
        <div className="flex">
          <span className="w-1/2 inline-block">{customContent.label && customContent.label}</span>
          <div className="w-1/2 flex">
            <span ref={customContent.customRef} className="truncate">
              {customContent.value && customContent.value}
            </span>
            <div className="shrink-0 w-4 h-4">
              <Image
                onClick={() => customContent.onCopy()}
                className="inline-block mr-2 cursor-pointer"
                src={'/images/infraicon/scp_ssh_copy.svg'}
                alt="copy"
                width={32}
                height={32}
              />
            </div>
          </div>
        </div>
      )}
      {infoDatas &&
        infoDatas.map((item) => (
          <div key={item.label}>
            <span className="w-1/2 inline-block">{item.label}</span>
            <span className="truncate">{item.value}</span>
          </div>
        ))}
    </div>
  );
}

type TClusterInfo = {
  detailName: string;
  onCancel: () => void;
  openEventDialog: (e: React.MouseEvent<HTMLDivElement>, item: TPgsqlDetail) => void;
  openDeleteDialog: (e: React.MouseEvent<HTMLDivElement>, item: TPgsqlDetail) => void;
};

export default function ClusterInfo(props: TClusterInfo) {
  const { detailName, onCancel, openEventDialog, openDeleteDialog } = props;
  const { kubeconfig } = useSessionStore((state) => state.getSession());
  const positioningRef = useRef<PositioningImperativeRef>(null);
  const dnsNameRef = useRef(null);
  const passwordRef = useRef(null);
  const [popverOpen, setPopverOpen] = useState(false);

  const { data, isSuccess } = useQuery(['getPgsql'], () =>
    request.post('/api/pgsql/getPgsql', { kubeconfig, pgsqlName: detailName })
  );

  const detailPgsql: TPgsqlDetail = data?.data;
  const namespace = detailPgsql?.metadata?.namespace;
  const dnsName = `${detailName}.${namespace}.svc.cluster.local`;

  const { data: pgsqlOthers } = useQuery(['getPgsqlOthers'], () =>
    request.post('/api/pgsql/getPgsqlOthers', { kubeconfig, pgsqlName: detailName })
  );

  const secretResult = pgsqlOthers?.data?.secretResult;
  const serviceResult = pgsqlOthers?.data?.serviceResult;

  const transformData = (obj: any): TInfoData[] => {
    if (!obj) {
      return [{ label: '暂无数据', value: '' }];
    }
    const result: TInfoData[] = [];
    Reflect.ownKeys(obj).map((key: any) => {
      let temp: TInfoData = {
        label: key,
        value: Array.isArray(obj[key]) ? '' : obj[key]
      };

      result.push(temp);
    });
    return result;
  };

  const copyContext = (copyContext: string) => {
    let timer: number;
    setPopverOpen((s) => {
      if (!popverOpen) {
        timer = window.setTimeout(() => setPopverOpen(false), 1000);
      } else {
        window.clearTimeout(timer);
      }
      return !s;
    });
    navigator.clipboard.writeText(copyContext);
  };

  const copyDnsName = () => {
    positioningRef.current?.setTarget(dnsNameRef.current as any);
    copyContext(dnsName);
  };

  const copyPassword = () => {
    positioningRef.current?.setTarget(passwordRef.current as any);
    copyContext(window.atob(secretResult?.body?.data?.password));
  };

  return (
    <div className={styles.pageWrapperScroll}>
      <div className={clsx(styles.header, 'flex items-center')}>
        <PgsqlStatus pgsqlDetail={detailPgsql} openEventDialog={openEventDialog} />
        <div className="ml-4">
          <Button
            type="danger"
            shape="round"
            handleClick={(e) => openDeleteDialog(e, detailPgsql)}
            icon={'/images/pgsql/delete.svg'}
          ></Button>
        </div>
        <div className="ml-auto">
          <Button
            shape="squareRound"
            handleClick={onCancel}
            icon={'/images/pgsql/close.svg'}
          ></Button>
        </div>
      </div>
      <div className={styles.title}>{detailPgsql?.metadata.name}</div>
      {secretResult?.body?.data?.username && (
        <InfoCard
          customContent={{
            label: window.atob(secretResult?.body?.data?.username),
            value: window.atob(secretResult?.body?.data?.password),
            customRef: passwordRef,
            onCopy: copyPassword
          }}
        />
      )}
      <InfoCard headerDatas={['users']} infoDatas={transformData(detailPgsql?.spec?.users)} />
      <InfoCard
        headerDatas={['database', 'users']}
        infoDatas={transformData(detailPgsql?.spec?.databases)}
      />
      <InfoCard
        infoDatas={[
          {
            label: 'IP',
            value: serviceResult?.body?.spec?.clusterIP
          },
          {
            label: 'port',
            value: serviceResult?.body?.spec?.ports[0]?.port
          }
        ]}
        customContent={{
          label: 'DNS name',
          value: dnsName,
          customRef: dnsNameRef,
          onCopy: copyDnsName
        }}
      />
      <InfoCard
        infoDatas={[
          {
            label: 'teamId',
            value: detailPgsql?.spec.teamId
          },
          {
            label: 'creationTime',
            value: formatTime(detailPgsql?.metadata.creationTimestamp, 'YYYY/MM/DD HH:mm')
          }
        ]}
      />
      <InfoCard
        infoDatas={[
          {
            label: 'postgreSQL version',
            value: detailPgsql?.spec.postgresql.version
          },
          {
            label: 'number of instance',
            value: detailPgsql?.spec.numberOfInstances
          }
        ]}
      />
      <InfoCard
        infoDatas={[
          {
            label: 'CPU',
            value: detailPgsql?.spec.resources.requests.cpu
          },
          {
            label: 'Memory',
            value: detailPgsql?.spec.resources.requests.memory
          }
        ]}
      />
      <InfoCard
        infoDatas={[
          {
            label: 'volume size',
            value: detailPgsql?.spec.volume.size
          }
        ]}
      />
      <Popover
        positioning={{ positioningRef }}
        open={popverOpen}
        onOpenChange={(e, data) => setPopverOpen(data.open)}
      >
        <PopoverSurface>copied!</PopoverSurface>
      </Popover>
    </div>
  );
}
