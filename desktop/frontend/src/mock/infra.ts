import { CRDMeta } from '../services/backend/kubernetes';

const infraMeta: CRDMeta = {
  group: 'infra.sealos.io',
  version: 'v1',
  namespace: 'infra-system',
  plural: 'infras'
};

const infraCRDTemplate: string = `
apiVersion: infra.sealos.io/v1
kind: Infra
metadata:
  name: {{ .infraName }}
  namespace: {{ .namespace }}
spec:
  hosts: 
  - roles: [ master ]
    count: {{ .masterCount }} 
    flavor: {{ .masterType }}
    image: "ami-0d66b970b9f16f1f5"
    disks:
    - capacity: {{.masterDisk}}
      type: "gp3"
      name: "/dev/sda2"
  - roles: [ node ]
    count: {{ .nodeCount }}
    flavor: {{ .nodeType }}
    image: "ami-0d66b970b9f16f1f5"
    disks:
    - capacity: {{.nodeDisk}}
      type: "gp2"
      name: "/dev/sda2"
`;

const clusterMeta: CRDMeta = {
  group: 'cluster.sealos.io',
  version: 'v1',
  namespace: 'cluster-system',
  plural: 'clusters'
};

const clusterCRDTemplate: string = `
apiVersion: cluster.sealos.io/v1
kind: Cluster
metadata:
  name: {{ .clusterName }}
  namespace: {{ .namespace }}
spec:
  infra: {{ .infraName}}
  ssh:
    user: ec2-user
    passwd: "123456"
    pk: /root/hurz_key.pem
    pkname: hurz_key
    port: 22
  images: 
    - {{ .image1}}
    - {{ .image2}} 
`;

export { infraMeta, infraCRDTemplate, clusterCRDTemplate };
