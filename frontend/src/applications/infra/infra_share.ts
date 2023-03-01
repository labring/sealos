const TABLE_HEADERS = [
  { key: 'id', label: 'ID' },
  { key: '角色', label: '角色' },
  { key: '规格', label: '规格' },
  { key: 'IP', label: 'IP' },
  { key: 'ssh密码', label: 'ssh密码' },
  { key: '操作', label: '操作' }
];

const SELECT_NODES = [
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

const SELECT_DISKS = [
  {
    label: 'gp3',
    key: 'gp3'
  },
  {
    label: 'gp2',
    key: 'gp2'
  }
];

const generateTemplate = (infraForm: any) => {
  const text = `\`\`\`yaml
apiVersion: infra.sealos.io/v1
kind: Infra
metadata:
  name: "${infraForm.infraName}"
spec:
  hosts:
  - roles: [master] 
    count: ${infraForm.masterCount}
    flavor: ${infraForm.masterType}
    image: "${infraForm.infraImage}"
    disks:
    - capacity: ${infraForm.masterDisk}
      volumeType: ${infraForm.masterDiskType}
      # allowed value is root|data
      type: "root"

  - roles: [ node ] 
    count: ${infraForm.nodeCount} 
    flavor: ${infraForm.nodeType}
    image: "${infraForm.infraImage}"
    disks:
    - capacity: ${infraForm.nodeDisk}
      volumeType: ${infraForm.nodeDiskType}
      # allowed value is root|data
      type: "root"
---
apiVersion: cluster.sealos.io/v1
kind: Cluster
metadata:
  name: ${infraForm.clusterName}
spec:
  infra: ${infraForm.infraName}
  image:
    - ${infraForm.image1}
    - ${infraForm.image2}
\`\`\``;
  return text;
};

const ConvertKeyToLabel = (key: string) => {
  const item = SELECT_NODES.find((item) => item.key === key);
  return item?.label;
};

function conversionPrice(price: number, reserve: number = 2) {
  return price.toFixed(reserve);
}

let timeout: any = null;
/**
 *
 * @param {Function} func
 * @param {Number} wait
 * @param {Boolean} immediate
 * @return null
 */
const debounce = (func: Function, wait = 1000, immediate = false) => {
  if (timeout !== null) clearTimeout(timeout);
  if (immediate) {
    const callNow = !timeout;

    timeout = setTimeout(function () {
      timeout = null;
    }, wait);
    if (callNow) typeof func === 'function' && func();
  } else {
    timeout = setTimeout(function () {
      typeof func === 'function' && func();
    }, wait);
  }
};

export {
  TABLE_HEADERS,
  SELECT_NODES,
  SELECT_DISKS,
  generateTemplate,
  ConvertKeyToLabel,
  conversionPrice,
  debounce
};
