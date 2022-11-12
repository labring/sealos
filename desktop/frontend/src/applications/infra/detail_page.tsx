import { Popover, PopoverSurface } from '@fluentui/react-components';
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow
} from '@fluentui/react-components/unstable';
import {
  Add16Filled,
  ArrowLeft16Regular,
  Delete16Regular,
  Person16Filled,
  Clock16Filled,
  EyeOff16Filled
} from '@fluentui/react-icons';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { useState } from 'react';
import request from 'services/request';
import useSessionStore from 'stores/session';
import { formatTime } from 'utils/format';
import styles from './detail_page.module.scss';
import { PageType, useScpContext } from './index';
import { ConvertKeyToLabel } from './infra_share';
import Image from 'next/image';

function DetailPage() {
  const { infraName, toPage } = useScpContext();
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const { kubeconfig } = useSessionStore((state) => state.getSession());

  const { data: scpInfo, status } = useQuery(['awsGet', infraName], () =>
    request.post('/api/infra/awsGet', { kubeconfig, infraName })
  );

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
    navigator.clipboard.writeText(scpInfo?.data?.status?.ssh?.pkdata);
  };

  const deleteInfra = async () => {
    const res = await request.post('/api/infra/awsDelete', { infraName, kubeconfig });
    toPage(PageType.FrontPage, '');
  };

  return (
    <div className={clsx(styles.detailPage, 'relative')}>
      <div className={clsx(styles.leftInfo)}>
        <div className={styles.infraTitle}> {scpInfo?.data?.metadata?.name} </div>
        <div className={clsx(styles.infraInfo, 'space-y-6')}>
          <span>id: {scpInfo?.data?.metadata?.uid}</span>
          <span> time: {formatTime(scpInfo?.data?.metadata?.creationTimestamp)}</span>
          <span>kuberentes:v1.24.0</span>
          <span>connections: {scpInfo?.data?.status?.connections} </span>
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
                  <TableHeaderCell className={styles.tableTitleId}>ID</TableHeaderCell>
                  <TableHeaderCell className="w-20">角色</TableHeaderCell>
                  <TableHeaderCell className="w-20">规格</TableHeaderCell>
                  <TableHeaderCell className={styles.tableTitleIp}>IP</TableHeaderCell>
                  <TableHeaderCell className="w-20">ssh密码</TableHeaderCell>
                  <TableHeaderCell className="w-20">操作</TableHeaderCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scpInfo?.data?.status?.hosts?.map((host: any) => {
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
                          <Delete16Regular color="#DE5462" />
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
