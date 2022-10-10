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
  name: {{ .infra_name }}
  namespace: {{ .namespace }}
spec:
    hosts: 
    - roles: [ master ]
      count: {{ .masterCount }} 
      flavor: {{ .masterType }}
      image: "ami-08bb4e3ce08ca7ddb"
    - roles: [ node ] # required
      count: {{ .nodeCount }}
      flavor: {{ .nodeType }}
      image: "ami-08bb4e3ce08ca7ddb"
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
  name: {{ .cluster_name }}
  namespace: {{ .namespace }}
spec:
  infra: {{ .infra_name}}
  images: [ {{ .image1}},{{ .image2}} ]
`;
export { infraMeta, infraCRDTemplate,clusterCRDTemplate };
