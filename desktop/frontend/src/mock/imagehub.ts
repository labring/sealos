import { CRDMeta } from '../services/backend/kubernetes';

const RepositoryMeta: CRDMeta = {
  group: 'imagehub.sealos.io',
  version: 'v1',
  namespace: 'sealos-imagehub',
  plural: 'repositories'
};

const ImageHubDataPackMeta: CRDMeta = {
  group: 'imagehub.sealos.io',
  version: 'v1',
  namespace: 'sealos-imagehub',
  plural: 'datapacks'
};

const enum DataPackType {
  BASE = 'base',
  GRID = 'grid',
  DETAIL = 'detail'
}

const ImageHubDataPackCRDTemplate: string = `
apiVersion: imagehub.sealos.io/v1
kind: DataPack
metadata:
  name: {{ .pack_name }}
  namespace: {{ .namespace }}
spec:
  type: {{ .pack_type }}
  names: [{{ join .images "," }}]
`;
export { RepositoryMeta, ImageHubDataPackMeta, DataPackType, ImageHubDataPackCRDTemplate };
