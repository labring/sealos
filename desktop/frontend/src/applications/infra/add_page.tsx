import { InputField } from '@fluentui/react-components/unstable';
import clsx from 'clsx';
import MarkDown from 'components/markdown';
import Image from 'next/image';
import { useEffect, useReducer, useRef, useState } from 'react';
import request from 'services/request';
import useAppStore from 'stores/app';
import useSessionStore from 'stores/session';
import { v4 as uuidv4 } from 'uuid';
import styles from './add_page.module.scss';
import { PageType, useScpContext } from './index';
import { generateTemplate } from './infra_share';
import SelectNodeComponent from './select_node';

const AddPage = () => {
  const { infraName, toPage } = useScpContext();
  const { kubeconfig } = useSessionStore((state) => state.getSession());
  const [image1, setImage1] = useState('labring/kubernetes:v1.24.0');
  const [image2, setImage2] = useState('labring/calico:v3.22.1');
  const [yamlTemplate, setYamlTemplate] = useState('');
  const [scpPrice, setScpPrice] = useState(0);
  const [inputNameErr, setInputNameErr] = useState(false);
  const oldInfraForm = useRef(null as any);
  const { currentApp, openedApps } = useAppStore();
  const curApp = openedApps.find((item) => item.name === currentApp?.name);
  const initInfra = {
    infraName: '',
    clusterName: '',
    masterType: 't2.medium',
    masterCount: 1,
    masterDisk: 16,
    masterDiskType: 'gp3',
    nodeType: 't2.medium',
    nodeCount: 1,
    nodeDisk: 16,
    nodeDiskType: 'gp3',
    userName: 'root', //暂定
    userPassword: uuidv4()
  };
  const infraReducer = (state: any, action: any) => {
    return { ...state, ...action.payload };
  };
  const [infraForm, dispatchInfraForm] = useReducer(infraReducer, initInfra);

  const applyInfra = async () => {
    const res = await request.post('/api/infra/awsApply', {
      ...infraForm,
      images: { image1, image2 },
      kubeconfig
    });
    goFrontPage();
  };

  const applyCluster = async () => {
    const clusterRes = await request.post('/api/infra/awsApplyCluster', {
      ...infraForm,
      kubeconfig,
      images: { image1, image2 }
    });
  };

  const goFrontPage = () => {
    if (infraName) {
      toPage(PageType.DetailPage, infraName);
    } else {
      toPage(PageType.FrontPage, '');
    }
  };

  function handleBtnClick() {
    if (infraName) {
      const infraUpdate = async () => {
        const res = await request.post('/api/infra/awsUpdate', {
          ...infraForm,
          kubeconfig,
          images: { image1, image2 },
          oldInfraForm: oldInfraForm.current
        });
      };
      infraUpdate();
      goFrontPage();
    } else {
      applyInfra();
      applyCluster();
    }
  }

  useEffect(() => {
    setYamlTemplate(generateTemplate({ image1, image2, ...infraForm }));
    const getPrice = async () => {
      const res = await request.post('/api/infra/awsGetPrice', infraForm);
      if (res?.data?.sumPrice) {
        setScpPrice(res.data.sumPrice);
      }
    };
    getPrice();
  }, [image1, image2, infraForm]);

  useEffect(() => {
    if (infraName) {
      const getAws = async () => {
        const res = await request.post('/api/infra/awsGet', {
          kubeconfig,
          infraName
        });
        if (res?.data?.metadata) {
          let { name } = res.data.metadata;
          let masterInfo = res.data?.spec?.hosts[0];
          let nodeInfo = res.data?.spec?.hosts[1];
          const payload = {
            infraName: name,
            clusterName: name,
            masterType: masterInfo.flavor,
            masterCount: masterInfo.count,
            masterDisk: masterInfo.disks[0].capacity,
            masterDiskType: masterInfo.disks[0].type,
            nodeType: nodeInfo.flavor,
            nodeCount: nodeInfo.count,
            nodeDisk: nodeInfo.disks[0].capacity,
            nodeDiskType: nodeInfo.disks[0].type
          };
          oldInfraForm.current = payload;
          dispatchInfraForm({ payload });
        }
      };
      getAws();
    }
  }, [infraName, kubeconfig]);

  return (
    <div className="flex h-full flex-col grow">
      <div className={clsx(styles.nav, 'cursor-pointer')} onClick={goFrontPage}>
        <Image
          className="inline-block mr-2"
          src="/images/infraicon/scp_back.svg"
          alt="id"
          width={8}
          height={16}
        />
        <span className=" pl-2"> {infraName ? '返回详情' : '返回列表'} </span>
      </div>
      <div className={clsx(styles.restWindow, styles.pageScroll, styles.pageWrapper)}>
        <div className="flex justify-center  w-full absolute box-border p-14 pt-0 ">
          <div>
            <div>
              <div className={styles.head}>
                <div className={styles.dot}></div>
                <span className={styles.info}>基础信息</span>
              </div>
              <div className="pl-8 mt-8  flex items-center">
                <div className={clsx(styles.cloudlabel, inputNameErr ? 'mb-6' : '')}>集群名字 </div>
                <InputField
                  className={clsx(
                    curApp?.size === 'maxmin' ? styles.inputNameMin : styles.inputName
                  )}
                  value={infraForm.infraName}
                  placeholder="请输入集群名称"
                  validationState={inputNameErr ? 'error' : 'success'}
                  validationMessage={inputNameErr ? '不能输入中文名称' : undefined}
                  onChange={(e, data) => {
                    if (/[\u4E00-\u9FA5]/g.test(data.value)) {
                      setInputNameErr(true);
                    } else {
                      setInputNameErr(false);
                    }

                    return dispatchInfraForm({
                      payload: { infraName: data.value, clusterName: data.value }
                    });
                  }}
                  disabled={infraName ? true : false}
                />
              </div>
            </div>
            <div className="mt-10">
              <SelectNodeComponent
                type="Master"
                nodeType={infraForm.masterType}
                nodeCount={infraForm.masterCount}
                diskType={infraForm.masterDiskType}
                nodeDisk={infraForm.masterDisk}
                dispatchInfraForm={dispatchInfraForm}
              />
            </div>
            <div className="mt-10">
              <SelectNodeComponent
                type="Node"
                nodeType={infraForm.nodeType}
                nodeCount={infraForm.nodeCount}
                diskType={infraForm.nodeDiskType}
                nodeDisk={infraForm.nodeDisk}
                dispatchInfraForm={dispatchInfraForm}
              />
            </div>
            <div className="flex mt-28  items-center space-x-8 justify-end  ">
              <div className={styles.moneyItem}>
                ￥ <span className={styles.money}> {scpPrice} </span> /小时
              </div>
              <button className={styles.confirmBtn} onClick={handleBtnClick}>
                {infraName ? '立即修改' : '立即创建'}
              </button>
            </div>
          </div>
          <div className={clsx(styles.markdown, 'ml-6')}>
            <MarkDown text={yamlTemplate}></MarkDown>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddPage;
