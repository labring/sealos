import { Popover, PopoverSurface } from '@fluentui/react-components';
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow
} from '@fluentui/react-components/unstable';
import { Add16Filled, ArrowLeft16Regular, Delete24Regular } from '@fluentui/react-icons';
import clsx from 'clsx';
import { useEffect, useState } from 'react';
import request from 'services/request';
import useSessionStore from 'stores/session';
import { formatTime } from 'utils/format';
import styles from './detail_page.module.scss';
import { ConvertKeyToLabel } from './infra_share';

type infraStatus = {
  connections: string;
  hosts: any;
  availabilityZone: string;
  ssh: {
    pkdata: string;
    pkname: string;
  };
};

type MetaData = {
  creationTimestamp: string;
  name: string;
  uid: string;
};

type DetailPageComponent = {
  infraName: string;
  backFront: () => void;
  toEditPageByName: (name: string) => void;
};

function DetailPage({ infraName, toEditPageByName, backFront }: DetailPageComponent) {
  let [infraItem, setInfraItem] = useState<infraStatus>({
    connections: '',
    hosts: [],
    availabilityZone: '',
    ssh: {
      pkdata: '',
      pkname: ''
    }
  });
  let [metaItem, setMetaItem] = useState<MetaData>({ name: '', creationTimestamp: '', uid: '' });
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const { kubeconfig } = useSessionStore((state) => state.getSession());

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
      const res = await request.post('/api/infra/awsGet', { kubeconfig, infraName });
      if (res?.data?.metadata) {
        setInfraItem(res.data.status);
        setMetaItem(res.data.metadata);
      }
    };
    getAws();
  }, [infraName, kubeconfig]);

  return (
    <div className={clsx(styles.detailPage, 'relative')}>
      <div className={clsx(styles.leftInfo)}>
        <div className={styles.infraTitle}> {metaItem?.name} </div>
        <div className={clsx(styles.infraInfo, 'space-y-6')}>
          <span>id: {metaItem?.uid} </span>
          <span>createTime: {formatTime(metaItem?.creationTimestamp)}</span>
          <span>connections: {infraItem?.connections} </span>
        </div>
        <button className={styles.releaseBtn} color="#DE5462">
          释放集群
        </button>
      </div>
      <div className={clsx(styles.rightInfo)}>
        <div className={clsx(styles.nav)}>
          <div className={clsx(styles.navBack, 'cursor-pointer')} onClick={backFront}>
            <ArrowLeft16Regular />
            <span className="pl-2"> 返回列表 </span>
          </div>
          <div
            className={clsx(styles.navBtn, 'cursor-pointer')}
            onClick={() => {
              toEditPageByName(infraName);
            }}
          >
            <Add16Filled color="#3981F5" /> <span className={styles.navBtnLabel}> 增加节点 </span>
          </div>
        </div>
        <div className={clsx(styles.nodeCard)}>
          <div className={clsx(styles.nodeTitle)}>节点信息</div>
          <div className={clsx(styles.pageWrapperScroll, 'grow')}>
            <Table className={clsx(styles.tableDetail, 'table-auto absolute ')}>
              <TableHeader>
                <TableRow>
                  <TableHeaderCell className={styles.tableTitleId}>ID</TableHeaderCell>
                  <TableHeaderCell className="w-20">角色</TableHeaderCell>
                  <TableHeaderCell className="w-20">规格</TableHeaderCell>
                  <TableHeaderCell className={styles.tableTitleIp}>IP</TableHeaderCell>
                  <TableHeaderCell className="w-20">ssh密码</TableHeaderCell>
                  <TableHeaderCell className="w-20">操作</TableHeaderCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {infraItem?.hosts?.map((host: any) => {
                  return host?.metadata.map((meta: any) => {
                    return (
                      <TableRow key={meta.id}>
                        <TableCell> {meta.id} </TableCell>
                        <TableCell> {host.roles[0]}</TableCell>
                        <TableCell> {ConvertKeyToLabel(host.flavor)} </TableCell>
                        <TableCell className={clsx(styles.net)}>
                          <>内网: {meta.ipaddress[0].ipValue} </>
                          <>公网: {meta.ipaddress[1].ipValue}</>
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
    </div>
  );
}

export default DetailPage;
