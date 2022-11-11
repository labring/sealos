import { Button, Input } from '@fluentui/react-components';
import { ArrowLeft24Regular } from '@fluentui/react-icons';
import clsx from 'clsx';
import MarkDown from 'components/markdown';
import { useEffect, useState } from 'react';
import request from 'services/request';
import useSessionStore from 'stores/session';
import styles from './add_page.module.scss';
import { generateTemplate } from './infra_share';
import SelectNodeComponent from './select_node';

type AddPageComponent = {
  editName: string; //edit tag important
  backEdtail: (name: string) => void;
  backFront: () => void;
};

const AddPage = ({ editName, backEdtail, backFront }: AddPageComponent) => {
  const { kubeconfig } = useSessionStore((state) => state.getSession());
  let [masterType, setMasterType] = useState('');
  let [nodeType, setNodeType] = useState('');
  let [image1, setImage1] = useState('labring/kubernetes:v1.24.0');
  let [image2, setImage2] = useState('labring/calico:v3.22.1');
  let [masterCount, setMasterCountValue] = useState('1');
  let [nodeCount, setNodeCountValue] = useState('1');
  let [infraName, setInfraName] = useState('');
  let [masterDisk, setMasterDisk] = useState(16);
  let [nodeDisk, setNodeDisk] = useState(16);
  let [infraPrice, setInfraPrice] = useState(0);
  let [clusterName, setClusterName] = useState('');
  let [yamlTemplate, setYamlTemplate] = useState('');
  let [masterDiskType, setMasterDiskType] = useState('');
  let [nodeDiskType, setNodeDiskType] = useState('');

  const goFrontPage = () => {
    if (editName) {
      backEdtail(editName);
    } else {
      backFront();
    }
  };

  function handleClick() {
    if (editName) {
      applyInfra();
    } else {
      applyInfra();
      applyCluster();
    }
  }

  const applyInfra = async () => {
    const res = await request.post('/api/infra/awsApply', {
      infraName,
      masterType: masterType,
      masterCount: masterCount,
      nodeType: nodeType,
      nodeCount: nodeCount,
      images: { image1, image2 },
      kubeconfig: kubeconfig,
      clusterName,
      masterDisk,
      nodeDisk
    });
    goFrontPage();
  };

  const applyCluster = async () => {
    const clusterRes = await request.post('/api/infra/awsApplyCluster', {
      infraName,
      clusterName,
      kubeconfig: kubeconfig,
      images: { image1, image2 }
    });
  };

  useEffect(() => {
    setYamlTemplate(
      generateTemplate(
        infraName,
        masterCount,
        masterType,
        masterDisk,
        nodeCount,
        nodeType,
        nodeDisk,
        clusterName,
        masterDiskType,
        nodeDiskType,
        image1,
        image2
      )
    );
    const getPrice = async () => {
      const res = await request.post('/api/infra/awsGetPrice', {
        masterType,
        masterCount,
        masterDisk,
        nodeType,
        nodeCount,
        nodeDisk,
        masterDiskType,
        nodeDiskType
      });
      if (res?.data?.sumPrice) {
        setInfraPrice(res.data.sumPrice);
      }
    };
    getPrice();
  }, [
    infraName,
    masterCount,
    masterType,
    masterDisk,
    nodeCount,
    nodeType,
    nodeDisk,
    clusterName,
    masterDiskType,
    nodeDiskType,
    image1,
    image2
  ]);

  useEffect(() => {
    if (editName) {
      const getAws = async () => {
        const res = await request.post('/api/infra/awsGet', { kubeconfig, infraName: editName });
        if (res?.data?.metadata) {
          let { name } = res.data.metadata;
          let masterInfo = res.data?.spec?.hosts[0];
          let nodeInfo = res.data?.spec?.hosts[1];
          setInfraName(name);
          setClusterName(name);
          setMasterType(masterInfo.flavor);
          setMasterCountValue(masterInfo.count);
          setMasterDiskType(masterInfo.disks[0].type);
          setMasterDisk(masterInfo.disks[0].capacity);
          setNodeType(nodeInfo.flavor);
          setNodeCountValue(nodeInfo.count);
          setNodeDiskType(nodeInfo.disks[0].type);
          setNodeDisk(nodeInfo.disks[0].capacity);
        }
      };
      getAws();
    }
  }, [editName, kubeconfig]);

  return (
    <div className="flex h-full flex-col grow">
      <div className={styles.nav} onClick={goFrontPage}>
        <ArrowLeft24Regular />
        <span className="cursor-pointer pl-2"> {editName ? '返回详情' : '返回列表'} </span>
      </div>
      <div className={clsx(styles.restWindow, styles.pageScroll, styles.pageWrapper)}>
        <div className="flex justify-center space-x-12  w-full absolute box-border p-14 pt-0 ">
          <div className={clsx('space-y-6')}>
            <div>
              <div className={styles.head}>
                <div className={styles.dot}></div>
                <span className={styles.info}>基础信息</span>
              </div>
              <div className="pl-8 mt-8 ">
                <span className={styles.cloudlabel}>集群名字 </span>
                <Input
                  className={styles.inputName}
                  value={infraName}
                  placeholder="请输入集群名称"
                  onChange={(e) => {
                    setInfraName(e.target.value);
                    setClusterName(e.target.value);
                  }}
                  disabled={editName ? true : false}
                ></Input>
              </div>
              <div className="px-8 mt-6">
                <span className={styles.cloudlabel}> 可用区 </span>
              </div>
            </div>
            <SelectNodeComponent
              type="Master"
              nodeType={masterType}
              setNodeType={setMasterType}
              nodeCount={masterCount}
              setNodeCountValue={setMasterCountValue}
              nodeDisk={masterDisk}
              setNodeDisk={setMasterDisk}
              diskType={masterDiskType}
              setDiskType={setMasterDiskType}
            />
            <SelectNodeComponent
              type="Node"
              nodeType={nodeType}
              setNodeType={setNodeType}
              nodeCount={nodeCount}
              setNodeCountValue={setNodeCountValue}
              nodeDisk={nodeDisk}
              setNodeDisk={setNodeDisk}
              diskType={nodeDiskType}
              setDiskType={setNodeDiskType}
            />
            <div className="flex items-center space-x-8 justify-end mr-10">
              <div className={styles.moneyItem}>
                ￥ <span className={styles.money}> {infraPrice} </span> /小时
              </div>
              <Button shape="square" appearance="primary" onClick={handleClick}>
                {editName ? '立即修改' : '立即创建'}
              </Button>
            </div>
          </div>
          <div className={clsx(styles.markdown)}>
            <MarkDown text={yamlTemplate}></MarkDown>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddPage;
