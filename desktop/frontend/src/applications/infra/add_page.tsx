import { Button, Input } from '@fluentui/react-components';
import { ArrowLeft24Regular } from '@fluentui/react-icons';
import clsx from 'clsx';
import MarkDown from 'components/markdown';
import { useState } from 'react';
import request from 'services/request';
import useSessionStore from 'stores/session';
import { v4 as uuidv4 } from 'uuid';
import styles from './add_page.module.scss';
import SelectNodeComponent from './select_node';
// import kubeconfig from './kubeconfig';
// import { CRDTemplateBuilder } from 'services/backend/wrapper';

const AddPage = ({ action }: { action: (page: number) => void }) => {
  const { kubeconfig } = useSessionStore((state) => state.getSession());
  var [masterType, setMasterType] = useState('');
  var [nodeType, setNodeType] = useState('');
  const [imageOption1, setImageOption1] = useState(true);
  const [imageOption2, setImageOption2] = useState(true);
  var [image1, setImage1] = useState('labring/kubernetes:v1.24.0');
  var [image2, setImage2] = useState('labring/calico:v3.24.1');
  var [masterCount, setMasterCountValue] = useState('1');
  var [nodeCount, setNodeCountValue] = useState('1');
  const session = useSessionStore((s) => s.session);
  const [infraName, setInfraName] = useState('');
  let [masterDisk, setMasterDisk] = useState(16);
  let [nodeDisk, setNodeDisk] = useState(16);
  let [amountMoney, setAmountMoney] = useState(19.9);
  let [clusterName, setClusterName] = useState(uuidv4());
  const textContent = ` 
\`\`\`yaml
apiVersion: infra.sealos.io/v1
kind: Infra
metadata:
  name: ${infraName}
spec:
  hosts:
  - roles: [master] 
    count: ${masterCount}
    flavor: ${masterType}
    image: "ami-05248307900d52e3a"
    disks:
    - capacity: ${masterDisk}
      type: "gp3"
      name: "/dev/sda2"
  - roles: [ node ] 
    count: ${nodeCount} 
    flavor: ${nodeType}
    image: "ami-05248307900d52e3a"
    disks:
    - capacity: ${nodeDisk}
      type: "gp2"
      name: "/dev/sda2"
---
apiVersion: cluster.sealos.io/v1
kind: Cluster
metadata:
  name: ${clusterName}
spec:
  infra: ${infraName}
  images:
  - labring/kubernetes:v1.24.0
  - labring/calico:v3.22.1
\`\`\`
`;

  const goFrontPage = () => {
    action(1);
  };

  async function handleClick() {
    const res = await request.post('/api/infra/awsapply', {
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
  }

  return (
    <div className="flex h-full flex-col grow">
      <div className={styles.nav} onClick={goFrontPage}>
        <ArrowLeft24Regular />
        <span className="cursor-pointer pl-2"> 返回列表 </span>
      </div>
      <div className={clsx(styles.restWindow, styles.pageScroll, styles.pageWrapper)}>
        <div className="flex justify-center space-x-12  w-full absolute box-border p-14 pt-0 ">
          <div className={clsx('space-y-6 ')}>
            <div>
              <div className={styles.head}>
                <div className={styles.dot}></div>
                <span className="pl-3">基础信息</span>
              </div>
              <div className="px-6 mt-7 ">
                <span className="w-24 inline-block ">集群名字 </span>
                <Input
                  className={styles.inputName}
                  value={infraName}
                  placeholder="请输入集群名称"
                  onChange={(e) => setInfraName(e.target.value)}
                ></Input>
              </div>
              <div className="px-6 mt-5">
                <span className="w-24 inline-block"> 可用区 </span>
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
            />
            <SelectNodeComponent
              type="Node"
              nodeType={nodeType}
              setNodeType={setNodeType}
              nodeCount={nodeCount}
              setNodeCountValue={setNodeCountValue}
              nodeDisk={nodeDisk}
              setNodeDisk={setNodeDisk}
            />
            <div className="flex items-center space-x-8 justify-end mr-10">
              <div className={styles.moneyItem}>
                ￥ <span className={styles.money}> {amountMoney} </span> /月
              </div>
              <Button shape="square" appearance="primary" onClick={handleClick}>
                立即创建
              </Button>
            </div>
          </div>
          <div className={clsx(styles.markdown)}>
            <MarkDown text={textContent}></MarkDown>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddPage;
