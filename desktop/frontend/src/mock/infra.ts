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
      image: "ami-08bb4e3ce08ca7ddb"
      disks:
      - capacity: {{.masterDisk}}
        type: "gp3"
        name: "/dev/sda2"
    - roles: [ node ] # required
      count: {{ .nodeCount }}
      flavor: {{ .nodeType }}
      image: "ami-08bb4e3ce08ca7ddb"
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
  images: [ {{ .image1}},{{ .image2}} ]
`;
const InfraMarkDownContent = ` 
apiVersion: infra.sealos.io/v1
kind: Infra
metadata:
  name: {{.infraName}}
spec:
  hosts:
  - roles: [master] 
    count: {{.masterCount}}
    flavor: {{.masterType}}
    disks:
    - capacity: {{.masterDisk}}
  - roles: [ node ] 
    count: {{.nodeCount}} 
    flavor: {{.nodeType}}
    disks:
    - capacity: {{.nodeDisk}}
---
apiVersion: cluster.sealos.io/v1
kind: Cluster
metadata:
  name: {{.clusterName}}
spec:
  infra: {{.infraName}}
  images:
  - labring/kubernetes:v1.24.0
  - labring/calico:v3.22.1
`;
export { infraMeta, infraCRDTemplate, clusterCRDTemplate, InfraMarkDownContent };
