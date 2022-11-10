const TableHeaders = [
  { key: 'id', label: 'ID' },
  { key: '角色', label: '角色' },
  { key: '规格', label: '规格' },
  { key: 'IP', label: 'IP' },
  { key: 'ssh密码', label: 'ssh密码' },
  { key: '操作', label: '操作' }
];

const SelectNodes = [
  {
    label: '2C4G',
    key: 't2.medium'
  },
  {
    label: '2C8G',
    key: 't2.large'
  },
  {
    label: '4C16G',
    key: 't2.xlarge'
  }
];

const SelectDisks = [
  {
    label: 'gp3',
    key: 'gp3'
  },
  {
    label: 'gp2',
    key: 'gp2'
  }
];

const generateTemplate = (
  infraName: string,
  masterCount: string,
  masterType: string,
  masterDisk: number,
  nodeCount: string,
  nodeType: string,
  nodeDisk: number,
  clusterName: string,
  masterDiskType: string,
  nodeDiskType: string,
  image1: string,
  image2: string
) => {
  const text = ` 
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
    image: "ami-0d66b970b9f16f1f5"
    disks:
    - capacity: ${masterDisk}
      type: ${masterDiskType}
      name: "/dev/sda2"
  - roles: [ node ] 
    count: ${nodeCount} 
    flavor: ${nodeType}
    image: "ami-0d66b970b9f16f1f5"
    disks:
    - capacity: ${nodeDisk}
      type: ${nodeDiskType}
      name: "/dev/sda2"
---
apiVersion: cluster.sealos.io/v1
kind: Cluster
metadata:
  name: ${clusterName}
spec:
  infra: ${infraName}
  ssh:
    user: ec2-user
    passwd: "123456"
    pk: /root/hurz_key.pem
    pkname: hurz_key
    port: 22
  images:
    - ${image1}
    - ${image2}
\`\`\`
`;
  return text;
};

const ConvertKeyToLabel = (key: string) => {
  const item = SelectNodes.find((item) => item.key === key);
  return item?.label;
};

export { TableHeaders, SelectNodes, SelectDisks, generateTemplate, ConvertKeyToLabel };
