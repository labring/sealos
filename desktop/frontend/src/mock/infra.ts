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
  name: "{{ .infraName }}"
  namespace: {{ .namespace }}
spec:
  hosts: 
  - roles: [ master ]
    count: {{ .masterCount }} 
    flavor: {{ .masterType }}
    image: "{{ .infraImage }}"
    disks:
    - capacity: {{.masterDisk}}
      volumeType: {{.masterDiskType}}
      type: "root"
  - roles: [ node ]
    count: {{ .nodeCount }}
    flavor: {{ .nodeType }}
    image: "{{ .infraImage }}"
    disks:
    - capacity: {{.nodeDisk}}
      volumeType: {{.nodeDiskType}}
      type: "root"
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
  name: "{{ .clusterName }}"
  namespace: {{ .namespace }}
spec:
  infra: "{{ .infraName}}"
  image: 
    - {{ .image1}}
    - {{ .image2}} 
`;

export { infraMeta, infraCRDTemplate, clusterCRDTemplate };
