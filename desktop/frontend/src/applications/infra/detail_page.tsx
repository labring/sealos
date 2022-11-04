import { Popover, PopoverSurface } from '@fluentui/react-components';
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow
} from '@fluentui/react-components/unstable';
import { Add16Filled, ArrowLeft24Regular, Delete24Regular } from '@fluentui/react-icons';
import clsx from 'clsx';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import request from 'services/request';
import styles from './detail_page.module.scss';
import { TableHeaders } from './infra_share';
// import kubeconfig from './kubeconfig';
import { formatTime } from 'utils/format';
import useSessionStore from 'stores/session';

interface infraStatus {
  connections: string;
  hosts: any;
  availabilityZone: string;
  ssh: {
    pkdata: string;
    pkname: string;
  };
}
interface metaData {
  creationTimestamp: string;
  name: string;
  uid: string;
}

function DetailPage({ action, infraName }: { action: (page: number) => void; infraName: string }) {
  let [infraItem, setInfraItem] = useState<infraStatus>({
    connections: '',
    hosts: [],
    availabilityZone: '',
    ssh: {
      pkdata: '',
      pkname: ''
    }
  });
  let [metaItem, setMetaItem] = useState<metaData>({ name: '', creationTimestamp: '', uid: '' });
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const { kubeconfig } = useSessionStore((state) => state.getSession());

  const goFrontPage = () => {
    action(1);
  };

  const copySSH = () => {
    let timer: number;
    setOpen((s) => {
      if (!open) {
        timer = window.setTimeout(() => setOpen(false), 1000);
      } else {
        window.clearTimeout(timer);
      }
      return !s;
    });
    navigator.clipboard.writeText(infraItem.ssh.pkdata);
  };

  useEffect(() => {
    const getAws = async () => {
      const res = await request.post('/api/infra/awsget', { kubeconfig, infraName });
      if (res?.data?.metadata) {
        setInfraItem(res.data.status);
        setMetaItem(res.data.metadata);
      }
    };
    getAws();
  }, [infraName, kubeconfig]);

  return (
    <div className={clsx(styles.wrap, 'flex flex-col h-full grow')}>
      <div className={clsx('flex pl-10 pt-4 items-center')} onClick={goFrontPage}>
        <ArrowLeft24Regular />
        <span className="cursor-pointer pl-2"> 返回列表 </span>
      </div>
      <div className={clsx(styles.concard, 'flex mt-16 items-center mx-16 h-48  ')}>
        <div className="pl-10">
          <Image src="/images/infraicon/infra_cluster.png" alt="infra" width={46} height={46} />
        </div>
        <div className="pl-8 grow">
          <div className={styles.infratitle}> {metaItem?.name} </div>
          <div className={clsx(styles.infracontent, 'pt-7 flex space-x-8 flex-wrap')}>
            <span>id: {metaItem?.uid} </span>
            <span>createTime: {formatTime(metaItem?.creationTimestamp)}</span>
          </div>
        </div>
        <div>
          <button className={styles.releaseBtn} color="#DE5462">
            释放集群
          </button>
        </div>
      </div>
      <div className={clsx(styles.pageWrapperScroll, styles.concard)}>
        <div className="space-y-6 w-full absolute ">
          <div className={clsx(styles.node_info)}>
            <span className={clsx(styles.node_title)}>节点信息</span>
            <button className={clsx(styles.node_btn)}>
              <span>
                <Add16Filled color="#3981F5;" />{' '}
              </span>
              <span> 增加节点 </span>
            </button>
          </div>
          <Table className={clsx(styles.table_detail, 'table-auto')}>
            <TableHeader>
              <TableRow>
                {TableHeaders.map((item) => (
                  <TableHeaderCell key={item.key}>{item.label}</TableHeaderCell>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {infraItem?.hosts.map((host: any) => {
                return host.metadata.map((meta: any) => {
                  return (
                    <TableRow key={meta.id}>
                      <TableCell> {meta.id} </TableCell>
                      <TableCell> {host.roles[0]}</TableCell>
                      <TableCell> {host.flavor} </TableCell>
                      <TableCell className={clsx(styles.net)}>
                        <span className="block">内网: {meta.ipaddress[0].ipValue} </span>
                        <span> 公网: {meta.ipaddress[1].ipValue}</span>
                      </TableCell>
                      <TableCell
                        ref={setTarget}
                        className={clsx(styles.copyssh)}
                        onClick={() => copySSH()}
                      >
                        复制
                      </TableCell>
                      <TableCell>
                        <Delete24Regular color="#DE5462" />
                      </TableCell>
                    </TableRow>
                  );
                });
              })}
            </TableBody>
          </Table>
          <Popover
            positioning={{ target }}
            open={open}
            onOpenChange={(e, data) => setOpen(data.open)}
          >
            <PopoverSurface>copied!</PopoverSurface>
          </Popover>
        </div>
      </div>
    </div>
  );
}

export default DetailPage;
