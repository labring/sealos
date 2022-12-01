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
spec:
  hosts: 
  - roles: [ master ]
    count: {{ .masterCount }} 
    flavor: {{ .masterType }}
    image: "ami-0d66b970b9f16f1f5"
    disks:
    - capacity: {{.masterDisk}}
      type: {{.masterDiskType}}
      name: "/dev/sda2"
  - roles: [ node ]
    count: {{ .nodeCount }}
    flavor: {{ .nodeType }}
    image: "ami-0d66b970b9f16f1f5"
    disks:
    - capacity: {{.nodeDisk}}
      type: {{.nodeDiskType}}
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
spec:
  infra: {{ .infraName}}
  image: 
    - {{ .image1}}
    - {{ .image2}} 
`;

export { infraMeta, infraCRDTemplate, clusterCRDTemplate };
