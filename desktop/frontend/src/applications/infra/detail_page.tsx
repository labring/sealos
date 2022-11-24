import { Popover, PopoverSurface, PositioningImperativeRef } from '@fluentui/react-components';
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow
} from '@fluentui/react-components/unstable';
import { Add16Filled, ArrowLeft16Regular, Delete16Regular } from '@fluentui/react-icons';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { useRef, useState } from 'react';
import request from 'services/request';
import useSessionStore from 'stores/session';
import { formatTime } from 'utils/format';
import styles from './detail_page.module.scss';
import { PageType, useScpContext } from './index';
import { ConvertKeyToLabel } from './infra_share';
import Image from 'next/image';

const SvgIcon = ({ src }: { src: string }) => {
  return <Image className="inline-block mr-2" src={src} alt="id" width={16} height={16} />;
};

function DetailPage() {
  const { infraName, toPage } = useScpContext();
  const [open, setOpen] = useState(false);
  const sshRef = useRef(null);
  const ipCopyRef = useRef(null);
  const positioningRef = useRef<PositioningImperativeRef>(null);
  const { kubeconfig } = useSessionStore((state) => state.getSession());

  const { data: scpInfo, status } = useQuery(['awsGet', infraName], () =>
    request.post('/api/infra/awsGet', { kubeconfig, infraName })
  );

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
    toPage(PageType.FrontPage, '');
  };

  return (
    <div className={clsx(styles.detailPage, 'relative')}>
      <div className={clsx(styles.leftInfo)}>
        <div className={styles.infraTitle}> {scpInfo?.data?.metadata?.name} </div>
        <div className={clsx(styles.infraInfo, 'space-y-6')}>
          <span>
            <SvgIcon src="/images/infraicon/scp_id.svg" />
            {scpInfo?.data?.metadata?.uid}
          </span>
          <span>
            <SvgIcon src="/images/infraicon/scp_clock.svg" />
            {formatTime(scpInfo?.data?.metadata?.creationTimestamp, 'YYYY/MM/DD mm:ss')}
          </span>
          <span>
            <SvgIcon src="/images/infraicon/scp_image.svg" />
            kuberentes:v1.24.0
          </span>
          <span>
            <SvgIcon src="/images/infraicon/scp_user.svg" />
            {scpInfo?.data.spec.ssh.user ? scpInfo.data.spec.ssh.user : 'root'}
          </span>
          <div
            className="cursor-pointer"
            ref={sshRef}
            onClick={() => {
              positioningRef.current?.setTarget(sshRef.current as any);
              copyContext(scpInfo?.data.spec.ssh.pkData);
            }}
          >
            <SvgIcon src="/images/infraicon/scp_ssh.svg" />
            <span className="mr-2">ssh 密钥</span>
            <SvgIcon src="/images/infraicon/scp_ssh_copy.svg" />
          </div>
        </div>
        <button className={styles.releaseBtn} color="#DE5462" onClick={() => deleteInfra()}>
          释放集群
        </button>
      </div>
      <div className={clsx(styles.rightInfo)}>
        <div className={clsx(styles.nav)}>
          <div
            className={clsx(styles.navBack, 'cursor-pointer')}
            onClick={() => toPage(PageType.FrontPage, '')}
          >
            <ArrowLeft16Regular />
            <span className="pl-2"> 返回列表 </span>
          </div>
          <div
            className={clsx(styles.navBtn, 'cursor-pointer')}
            onClick={() => {
              toPage(PageType.AddPage, infraName);
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
                  <TableHeaderCell className="w-20">
                    <span className={styles.tableHead1px} />
                    节点
                  </TableHeaderCell>
                  <TableHeaderCell className="w-32">
                    <span className={styles.tableHead1px} />
                    ID
                  </TableHeaderCell>
                  <TableHeaderCell className="w-16">
                    <span className={styles.tableHead1px} />
                    规格
                  </TableHeaderCell>
                  <TableHeaderCell className="w-64">
                    <span className={styles.tableHead1px} />
                    <span ref={ipCopyRef}>IP内网-公网</span>
                  </TableHeaderCell>
                  <TableHeaderCell className="w-16">
                    <span className={styles.tableHead1px} />
                    操作
                  </TableHeaderCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scpInfo?.data?.spec?.hosts?.map((host: any) => {
                  return host?.metadata.map((meta: any) => {
                    return (
                      <TableRow key={meta.id}>
                        <TableCell>
                          {host.roles[0] === 'master' && (
                            <SvgIcon src="/images/infraicon/scp_master.svg" />
                          )}
                          {host.roles[0] === 'node' && (
                            <SvgIcon src="/images/infraicon/scp_node.svg" />
                          )}
                          {host.roles[0] === 'master' ? 'Master' : 'Node'}
                        </TableCell>
                        <TableCell> {meta.id} </TableCell>
                        <TableCell> {ConvertKeyToLabel(host.flavor)} </TableCell>
                        <TableCell className={clsx(styles.net)}>
                          <span className="w-24 inline-block mr-1">
                            {meta.ipaddress[0].ipValue}
                          </span>
                          <span
                            className="cursor-pointer"
                            onClick={() => {
                              positioningRef.current?.setTarget(ipCopyRef.current as any);
                              copyContext(meta.ipaddress[0].ipValue);
                            }}
                          >
                            <SvgIcon src="/images/infraicon/scp_ip_copy.svg" />
                          </span>
                          <span className="w-24  inline-block mr-1">
                            {meta.ipaddress[1].ipValue}
                          </span>
                          <span
                            className="cursor-pointer"
                            onClick={() => {
                              positioningRef.current?.setTarget(ipCopyRef.current as any);
                              copyContext(meta.ipaddress[1].ipValue);
                            }}
                          >
                            <SvgIcon src="/images/infraicon/scp_ip_copy.svg" />
                          </span>
                        </TableCell>
                        <TableCell>
                          <SvgIcon src="/images/infraicon/scp_delete.svg" />
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
    </div>
  );
}

export default DetailPage;
