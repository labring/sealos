import { Button, Input } from '@fluentui/react-components';
import { ArrowLeft24Regular } from '@fluentui/react-icons';
import clsx from 'clsx';
import MarkDown from 'components/markdown';
import { useEffect, useState } from 'react';
import request from 'services/request';
import useSessionStore from 'stores/session';
import { v4 as uuidv4 } from 'uuid';
import styles from './add_page.module.scss';
import { generateTemplate } from './infra_share';
import SelectNodeComponent from './select_node';

interface AddPageComponent {
  edit_name: string; //edit tag important
  action: (page: number) => void;
  toDetailByName: (name: string) => void;
}

const AddPage = ({ action, edit_name, toDetailByName }: AddPageComponent) => {
  const { kubeconfig } = useSessionStore((state) => state.getSession());
  var [masterType, setMasterType] = useState('');
  var [nodeType, setNodeType] = useState('');
  var [image1, setImage1] = useState('labring/kubernetes:v1.24.0');
  var [image2, setImage2] = useState('labring/calico:v3.22.1');
  var [masterCount, setMasterCountValue] = useState('1');
  var [nodeCount, setNodeCountValue] = useState('1');
  const [infraName, setInfraName] = useState('');
  let [masterDisk, setMasterDisk] = useState(16);
  let [nodeDisk, setNodeDisk] = useState(16);
  let [InfraPrice, setInfraPrice] = useState(0);
  let [clusterName, setClusterName] = useState(uuidv4());
  const [YamlTemplate, setYamlTemplate] = useState('');
  var [masterDiskType, setMasterDiskType] = useState('');
  var [nodeDiskType, setNodeDiskType] = useState('');

  const goFrontPage = () => {
    if (edit_name) {
      toDetailByName(edit_name);
    } else {
      action(1);
    }
  };

  async function handleClick() {
    if (edit_name) {
      ApplyInfra();
    } else {
      ApplyInfra();
      ApplyCluster();
    }
  }

  const ApplyInfra = async () => {
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

  const ApplyCluster = async () => {
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
    if (edit_name) {
      const getAws = async () => {
        const res = await request.post('/api/infra/awsGet', { kubeconfig, infraName: edit_name });
        if (res?.data?.metadata) {
          let { name } = res.data.metadata;
          let masterInfo = res.data?.spec?.hosts[0];
          let nodeInfo = res.data?.spec?.hosts[1];
          setInfraName(name);
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
  }, [edit_name, kubeconfig]);

  return (
    <div className="flex h-full flex-col grow">
      <div className={styles.nav} onClick={goFrontPage}>
        <ArrowLeft24Regular />
        <span className="cursor-pointer pl-2"> {edit_name ? '返回详情' : '返回列表'} </span>
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
                  onChange={(e) => setInfraName(e.target.value)}
                  disabled={edit_name ? true : false}
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
              DiskType={masterDiskType}
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
              DiskType={nodeDiskType}
              setDiskType={setNodeDiskType}
            />
            <div className="flex items-center space-x-8 justify-end mr-10">
              <div className={styles.moneyItem}>
                ￥ <span className={styles.money}> {InfraPrice} </span> /小时
              </div>

              <Button shape="square" appearance="primary" onClick={handleClick}>
                {edit_name ? '立即修改' : '立即创建'}
              </Button>
            </div>
          </div>
          <div className={clsx(styles.markdown)}>
            <MarkDown text={YamlTemplate}></MarkDown>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddPage;
