import {
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Popover,
  PopoverSurface,
  PositioningImperativeRef
} from '@fluentui/react-components';
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow
} from '@fluentui/react-components/unstable';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import Image from 'next/image';
import { useRef, useState } from 'react';
import request from 'services/request';
import useAppStore from 'stores/app';
import useSessionStore from 'stores/session';
import { formatTime } from 'utils/format';
import styles from './detail_page.module.scss';
import { PageType, useScpContext } from './index';
import { ConvertKeyToLabel } from './infra_share';
import StatusComponent from './scp_status';

const SvgIcon = ({ src, width = 16 }: { src: string; width?: number }) => {
  return <Image className="inline-block mr-2" src={src} alt="id" width={width} height={16} />;
};

function DetailPage() {
  const { infraName, toPage } = useScpContext();
  const [open, setOpen] = useState(false);
  const sshRef = useRef(null);
  const copyIdRef = useRef(null);
  const inIpRef = useRef(null);
  const outIpRef = useRef(null);
  const [deDialog, setDeDialog] = useState(false);
  const positioningRef = useRef<PositioningImperativeRef>(null);
  const { kubeconfig } = useSessionStore((state) => state.getSession());
  const { currentApp, openedApps } = useAppStore();
  const curApp = openedApps.find((item) => item.name === currentApp?.name);
  const { data: scpInfo, status } = useQuery(['awsGet', infraName], () =>
    request.post('/api/infra/awsGet', { kubeconfig, infraName })
  );
  const { data: clusterInfo } = useQuery(['awsGetCluster', infraName], () =>
    request.post('/api/infra/getCluster', { kubeconfig, clusterName: infraName })
  );
  const nameLen = scpInfo?.data?.metadata?.name.length;
  const infraStatus = scpInfo?.data?.status?.status || 'Pending';
  const clusterStatus = clusterInfo?.data?.status?.status || 'Pending';
  // console.log(scpInfo, clusterInfo, 'detail');

  const copyContext = (copyContext: string) => {
    let timer: number;
    setOpen((s) => {
      if (!open) {
        timer = window.setTimeout(() => setOpen(false), 1000);
      } else {
        window.clearTimeout(timer);
      }
      return !s;
    });
    navigator.clipboard.writeText(copyContext);
  };

  const deleteInfra = async () => {
    const result = await request.post('/api/infra/awsDeleteCluster', { infraName, kubeconfig });
    const res = await request.post('/api/infra/awsDelete', { infraName, kubeconfig });
    setDeDialog(false);
    toPage(PageType.FrontPage, '');
  };

  return (
    <div className={clsx(styles.detailPage, 'relative')}>
      <div className={clsx(curApp?.size === 'maxmin' ? styles.leftInfoMin : styles.leftInfo)}>
        <div className={clsx(styles.infraTitle, 'flex items-center')}>
          <span className="w-40 truncate">{scpInfo?.data?.metadata?.name}</span>
          <StatusComponent infraStatus={infraStatus} clusterStatus={clusterStatus} desc={false} />
          {nameLen > 10 && (
            <div className={styles.hiddenName}>{scpInfo?.data?.metadata?.name} </div>
          )}
        </div>
        <div className={clsx(styles.infraInfo, nameLen > 10 ? styles.hiddenInfo : '')}>
          <div
            className={clsx(styles.scpId, 'flex cursor-pointer')}
            ref={copyIdRef}
            onClick={() => {
              positioningRef.current?.setTarget(copyIdRef.current as any);
              copyContext(scpInfo?.data?.metadata?.uid);
            }}
          >
            <SvgIcon src="/images/infraicon/scp_id.svg" />
            <span className="w-24 truncate">{scpInfo?.data?.metadata?.uid}</span>
            <span className="ml-2">
              <SvgIcon src="/images/infraicon/scp_ssh_copy.svg" width={10} />
            </span>
            <div className={styles.hiddenId}>{scpInfo?.data?.metadata?.uid}</div>
          </div>
          <span className={clsx(styles.hiddenTime, 'mt-4')}>
            <SvgIcon src="/images/infraicon/scp_clock.svg" />
            {formatTime(scpInfo?.data?.metadata?.creationTimestamp, 'YYYY/MM/DD HH:mm:ss')}
          </span>
          <span className="mt-4">
            <SvgIcon src="/images/infraicon/scp_image.svg" />
            kuberentes:v1.24.0
          </span>
          <span className="mt-4">
            <SvgIcon src="/images/infraicon/scp_user.svg" />
            {scpInfo?.data?.spec?.ssh?.user ? scpInfo.data.spec.ssh.user : 'root'}
          </span>
          <div
            className="cursor-pointer mt-4"
            ref={sshRef}
            onClick={() => {
              positioningRef.current?.setTarget(sshRef.current as any);
              copyContext(scpInfo?.data.spec.ssh?.pkData);
            }}
          >
            <SvgIcon src="/images/infraicon/scp_ssh.svg" />
            <span className="mr-2">ssh 密钥</span>
            <SvgIcon src="/images/infraicon/scp_ssh_copy.svg" width={10} />
          </div>
        </div>
        <button
          className={clsx(curApp?.size === 'maxmin' ? styles.releaseBtnMin : styles.releaseBtn)}
          onClick={() => setDeDialog(true)}
        >
          释放
        </button>
      </div>
      <div className={clsx(styles.rightInfo)}>
        <div
          className={clsx(styles.nav, 'cursor-pointer')}
          onClick={() => toPage(PageType.FrontPage, '')}
        >
          <SvgIcon src="/images/infraicon/scp_back.svg" width={8} />
          <span>返回首页</span>
        </div>
        <div className="flex items-center pl-12 pr-10 pt-6 justify-between ">
          <span className={styles.detailTitle}>节点列表</span>
          <button
            className={clsx(styles.changeBtn)}
            onClick={() => {
              toPage(PageType.AddPage, infraName);
            }}
          >
            集群变更
          </button>
        </div>
        <div className={clsx(styles.nodeCard)}>
          <div className={clsx(styles.pageWrapperScroll, 'grow')}>
            <Table className={clsx(styles.tableDetail, 'absolute ')}>
              <TableHeader>
                <TableRow>
                  <TableHeaderCell>节点</TableHeaderCell>
                  <TableHeaderCell className={clsx(curApp?.size === 'maxmin' ? 'w-28' : '')}>
                    状态
                  </TableHeaderCell>
                  <TableHeaderCell className={clsx(curApp?.size === 'maxmin' ? 'w-28' : '')}>
                    ID
                  </TableHeaderCell>
                  <TableHeaderCell className={clsx(curApp?.size === 'maxmin' ? 'w-16' : '')}>
                    规格
                  </TableHeaderCell>
                  <TableHeaderCell className={clsx(curApp?.size === 'maxmin' ? 'w-44' : '')}>
                    <span ref={inIpRef}>内网</span>
                  </TableHeaderCell>
                  <TableHeaderCell className={clsx(curApp?.size === 'maxmin' ? 'w-44' : '')}>
                    <span ref={outIpRef}> 公网 </span>
                  </TableHeaderCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scpInfo?.data?.spec?.hosts?.map((host: any) => {
                  return host?.metadata?.map((meta: any) => {
                    return (
                      <TableRow key={meta.id}>
                        <TableCell>
                          {host.roles[0] === 'master' && (
                            <SvgIcon src="/images/infraicon/scp_master.svg" />
                          )}
                          {host.roles[0] === 'node' && (
                            <SvgIcon src="/images/infraicon/scp_node.svg" />
                          )}
                          <span>{host.roles[0] === 'master' ? 'Master' : 'Node'} </span>
                        </TableCell>
                        <TableCell>
                          <SvgIcon
                            src={'/images/infraicon/scp_status_' + `${meta?.status}` + '.svg'}
                          ></SvgIcon>
                          {meta?.status}
                        </TableCell>
                        <TableCell className="break-all">{meta.id}</TableCell>
                        <TableCell> {ConvertKeyToLabel(host.flavor)} </TableCell>
                        <TableCell>
                          <span className="w-32 inline-block  break-all">
                            {meta.ipaddress[0].ipValue}
                          </span>
                          <span
                            className="cursor-pointer pl-1"
                            onClick={() => {
                              positioningRef.current?.setTarget(inIpRef.current as any);
                              copyContext(meta.ipaddress[0].ipValue);
                            }}
                          >
                            <SvgIcon src="/images/infraicon/scp_ip_copy.svg" width={10} />
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="w-32 inline-block break-all">
                            {meta.ipaddress[1].ipValue}
                          </span>
                          <span
                            className="cursor-pointer "
                            onClick={() => {
                              positioningRef.current?.setTarget(outIpRef.current as any);
                              copyContext(meta.ipaddress[1].ipValue);
                            }}
                          >
                            <SvgIcon src="/images/infraicon/scp_ip_copy.svg" width={10} />
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  });
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
      <Popover
        positioning={{ positioningRef }}
        open={open}
        onOpenChange={(e, data) => setOpen(data.open)}
      >
        <PopoverSurface>copied!</PopoverSurface>
      </Popover>
      <Dialog modalType="alert" open={deDialog}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>确定释放集群？</DialogTitle>
            <DialogContent>集群释放后，资源将不可找回。 </DialogContent>
            <DialogActions>
              <button className={styles.cancelBtn} onClick={() => setDeDialog(false)}>
                取消
              </button>
              <button className={styles.confirmBtn} onClick={() => deleteInfra()}>
                确定
              </button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  );
}

export default DetailPage;
