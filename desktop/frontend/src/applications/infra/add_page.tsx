import { Dialog, DialogSurface } from '@fluentui/react-components';
import { Dropdown, InputField, Option } from '@fluentui/react-components/unstable';
import { useMutation, useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import MarkDown from 'components/markdown';
import Image from 'next/image';
import { useEffect, useReducer, useRef, useState } from 'react';
import request from 'services/request';
import useAppStore from 'stores/app';
import useSessionStore from 'stores/session';
import styles from './add_page.module.scss';
import { PageType, useScpContext } from './index';
import { conversionPrice, debounce, generateTemplate } from './infra_share';
import SelectNodeComponent from './select_node';
import { omit } from 'lodash';

const AddPage = () => {
  const { infraName, toPage } = useScpContext();
  const { kubeconfig } = useSessionStore((state) => state.getSession());
  const [image1, setImage1] = useState('labring/kubernetes:v1.25.5');
  const [image2, setImage2] = useState('labring/calico:v3.24.1');
  const [imageKey, setImageKey] = useState('amazon-linux');
  const [diskLimit, setDiskLimit] = useState(8);
  const [yamlTemplate, setYamlTemplate] = useState('');
  const [scpPrice, setScpPrice] = useState(0);
  const [inputNameErr, setInputNameErr] = useState(false);
  const [nameErrMsg, setNameErrMsg] = useState(
    "必须以字母数字开头、结尾;只能包含小写字母、数字，以及 '-' 和 '.'"
  );
  const [isLoading, setIsloading] = useState(false);
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
    nodeDiskType: 'gp3'
  };
  const infraReducer = (state: any, action: any) => {
    return { ...state, ...action.payload };
  };
  const [infraForm, dispatchInfraForm] = useReducer(infraReducer, initInfra);
  const { data } = useQuery(
    ['getConfigMap'],
    async () =>
      await request.post('/api/infra/getConfigMap', {
        kubeconfig,
        name: 'infra-ami-config'
      })
  );
  const imageKeyList = omit(data?.data?.data, ['lower-limit-GPU', 'lower-limit']);

  const applyInfraMutation = useMutation({
    mutationFn: () => {
      return request.post('/api/infra/awsApply', {
        ...infraForm,
        images: { image1, image2 },
        infraImage: imageKeyList[imageKey],
        kubeconfig
      });
    },
    onSettled: () => {
      setIsloading(false);
      goFrontPage();
    }
  });

  const applyClusterMutation = useMutation({
    mutationFn: () => {
      return request.post('/api/infra/awsApplyCluster', {
        ...infraForm,
        kubeconfig,
        images: { image1, image2 }
      });
    },
    onSettled: () => {}
  });

  const updateInfraMutation = useMutation({
    mutationFn: () => {
      return request.post('/api/infra/awsUpdate', {
        ...infraForm,
        kubeconfig,
        images: { image1, image2 },
        oldInfraForm: oldInfraForm.current
      });
    },
    onSettled: () => {
      setIsloading(false);
      goFrontPage();
    }
  });

  const goFrontPage = () => {
    if (infraName) {
      toPage(PageType.DetailPage, infraName);
    } else {
      toPage(PageType.FrontPage, '');
    }
  };

  const validResourcesName = (str: string): boolean => {
    let pattern = /^[a-z0-9]+([-.][a-z0-9]+)*$/;
    return pattern.test(str);
  };

  const handleDropdown = (value: string) => {
    let limitValue =
      value === 'ubuntu-GPU'
        ? data?.data?.data['lower-limit-GPU']
        : data?.data?.data['lower-limit'];
    setDiskLimit(limitValue);
    setImageKey(value);
    dispatchInfraForm({
      payload: {
        masterDisk: limitValue,
        nodeDisk: limitValue
      }
    });
  };

  const infraExist = async (name: string) => {
    const res = await request.post('/api/infra/awsGet', {
      kubeconfig,
      infraName: name
    });
    return !!res.data.status;
  };

  async function handleBtnClick() {
    if (infraName) {
      updateInfraMutation.mutate();
      setIsloading(true);
    } else if (validResourcesName(infraForm.infraName)) {
      if (await infraExist(infraForm.infraName)) {
        setInputNameErr(true);
        setNameErrMsg('名称重复');
      } else {
        setIsloading(true);
        applyInfraMutation.mutate();
        applyClusterMutation.mutate();
      }
    } else {
      setInputNameErr(true);
    }
  }

  useEffect(() => {
    setYamlTemplate(
      generateTemplate({ image1, infraImage: imageKeyList[imageKey], image2, ...infraForm })
    );
    const getPrice = async () => {
      const res = await request.post('/api/infra/awsGetPrice', infraForm);
      if (res?.data?.sumPrice) {
        setScpPrice(res.data.sumPrice);
      }
    };
    debounce(getPrice);
  }, [image1, image2, imageKey, imageKeyList, infraForm]);

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
            masterDiskType: masterInfo.disks[0].volumeType,
            nodeType: nodeInfo.flavor,
            nodeCount: nodeInfo.count,
            nodeDisk: nodeInfo.disks[0].capacity,
            nodeDiskType: nodeInfo.disks[0].volumeType
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
              <div className="mt-8 flex">
                <div className={clsx(styles.cloudlabel)}>
                  <span style={{ color: '#EC872A' }}>*</span> 集群名字
                </div>
                <InputField
                  className={clsx(
                    curApp?.size === 'maxmin' ? styles.inputNameMin : styles.inputName
                  )}
                  value={infraForm.infraName}
                  placeholder="请输入集群名称"
                  validationMessageIcon={null}
                  validationState={inputNameErr ? 'error' : 'success'}
                  validationMessage={inputNameErr ? nameErrMsg : undefined}
                  onChange={(e, data) => {
                    setInputNameErr(!validResourcesName(data.value));
                    setNameErrMsg(
                      "必须以字母数字开头、结尾;只能包含小写字母、数字，以及 '-' 和 '.'"
                    );
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
                diskLimit={diskLimit}
              />
              <div className="pl-8 mt-6">
                <span className={styles.imageLabel}>镜像</span>
                <Dropdown
                  className={styles.imageDropdown}
                  defaultSelectedOptions={[imageKey]}
                  onOptionSelect={(e, data) => handleDropdown(data.optionValue as string)}
                  disabled={infraName ? true : false}
                >
                  {imageKeyList &&
                    Object.keys(imageKeyList)?.map((key) => <Option key={key}>{key}</Option>)}
                </Dropdown>
              </div>
            </div>
            <div className="mt-10">
              <SelectNodeComponent
                type="Node"
                nodeType={infraForm.nodeType}
                nodeCount={infraForm.nodeCount}
                diskType={infraForm.nodeDiskType}
                nodeDisk={infraForm.nodeDisk}
                dispatchInfraForm={dispatchInfraForm}
                diskLimit={diskLimit}
              />
            </div>
            <div className="flex mt-28  items-center space-x-8 justify-end  ">
              <div className={styles.moneyItem}>
                ￥ <span className={styles.money}> {conversionPrice(scpPrice, 2)} </span> /小时
              </div>
              <button className={styles.confirmBtn} onClick={handleBtnClick}>
                {infraName ? '立即修改' : '立即创建'}
              </button>
            </div>
          </div>
          <div className={clsx(styles.markdown, 'ml-6')}>
            <MarkDown text={yamlTemplate} isShowCopyBtn></MarkDown>
          </div>
        </div>
      </div>
      <Dialog open={isLoading}>
        <DialogSurface className={styles.customDialog}>
          <div className="flex items-center justify-center">
            <Image src="/images/infraicon/loading.gif" alt="infra" width={60} height={60} />
            <div>{infraName ? '变更中' : '创建中'}</div>
          </div>
        </DialogSurface>
      </Dialog>
    </div>
  );
};

export default AddPage;
