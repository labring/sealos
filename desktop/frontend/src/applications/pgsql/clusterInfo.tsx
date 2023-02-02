import { Popover, PopoverSurface, PopoverTrigger } from '@fluentui/react-components';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import Image from 'next/image';
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
  isCopy?: boolean;
};

type TInfoCard = {
  infoDatas?: TInfoData[];
  headerDatas?: string[];
};

type TClusterInfo = {
  detailName: string;
  onCancel: () => void;
  openEventDialog: (e: React.MouseEvent<HTMLDivElement>, item: TPgsqlDetail) => void;
  openDeleteDialog: (e: React.MouseEvent<HTMLDivElement>, item: TPgsqlDetail) => void;
};

type TSecret = {
  data: {
    password: string;
    username: string;
  };
};

function InfoCard(props: TInfoCard) {
  const { infoDatas, headerDatas } = props;
  const copyContext = (copyContext: string) => {
    navigator.clipboard.writeText(copyContext);
  };

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
      {infoDatas &&
        infoDatas.map((item) => (
          <div key={item.label} className="flex">
            <div className="w-1/2 shrink-0">{item.label}</div>
            <div className="truncate">{item.value}</div>
            {item.isCopy && (
              <Popover>
                <PopoverTrigger disableButtonEnhancement>
                  <div className="shrink-0 w-4 h-4">
                    <Image
                      onClick={() => copyContext(item.value.toString())}
                      className="inline-block mr-2 cursor-pointer"
                      src={'/images/infraicon/scp_ssh_copy.svg'}
                      alt="copy"
                      width={16}
                      height={16}
                    />
                  </div>
                </PopoverTrigger>
                <PopoverSurface>copied</PopoverSurface>
              </Popover>
            )}
          </div>
        ))}
    </div>
  );
}

export default function ClusterInfo(props: TClusterInfo) {
  const { detailName, onCancel, openEventDialog, openDeleteDialog } = props;
  const { kubeconfig } = useSessionStore((state) => state.getSession());

  const { data } = useQuery(['getPgsql'], () =>
    request.post('/api/pgsql/getPgsql', { kubeconfig, pgsqlName: detailName })
  );
  const detailPgsql: TPgsqlDetail = data?.data;
  const namespace = detailPgsql?.metadata?.namespace;
  const dnsName = `${detailName}.${namespace}.svc.cluster.local`;

  const { data: pgsqlOthers } = useQuery({
    queryKey: ['getPgsqlOthers'],
    queryFn: () =>
      request.post('/api/pgsql/getPgsqlOthers', {
        kubeconfig,
        pgsqlName: detailName,
        users: ['postgres', 'standby', ...Object.keys(detailPgsql?.spec?.users)]
      }),
    enabled: !!detailPgsql?.spec?.users
  });
  const serviceResult = pgsqlOthers?.data?.serviceResult;
  const secretInfoData = pgsqlOthers?.data?.secretResult?.map((item: TSecret) => {
    return {
      label: window.atob(item?.data?.username),
      value: window.atob(item?.data?.password),
      isCopy: true
    };
  });

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

  return (
    <>
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
      <InfoCard headerDatas={['username', 'password']} infoDatas={secretInfoData} />
      <InfoCard
        headerDatas={['database', 'users']}
        infoDatas={transformData(detailPgsql?.spec?.databases)}
      />
      <InfoCard
        infoDatas={[
          {
            label: 'DNS name',
            value: dnsName,
            isCopy: true
          },
          {
            label: 'IP',
            value: serviceResult?.body?.spec?.clusterIP
          },
          {
            label: 'port',
            value: serviceResult?.body?.spec?.ports[0]?.port
          }
        ]}
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
    </>
  );
}
