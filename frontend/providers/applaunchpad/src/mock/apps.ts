import { AppListItemType, AppDetailType, PodDetailType, AppEditSyncedFields } from '@/types/app';
import { appStatusMap, podStatusMap } from '@/constants/app';
import { customAlphabet } from 'nanoid';
const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz', 12);

export const MOCK_APPS: AppListItemType[] = [
  {
    id: 'string',
    name: 'string',
    status: appStatusMap.running,
    createTime: 'string',
    cpu: 100,
    memory: 100,
    usedCpu: {
      name: '',
      xData: new Array(30).fill(0),
      yData: new Array(30).fill('0')
    },
    usedMemory: {
      name: '',
      xData: new Array(30).fill(0),
      yData: new Array(30).fill('0')
    },
    activeReplicas: 1,
    isPause: false,
    maxReplicas: 1,
    minReplicas: 1,
    storeAmount: 0,
    labels: {},
    source: {
      hasSource: false,
      sourceName: '',
      sourceType: 'app_store'
    }
  },
  {
    id: 'string2',
    name: 'string',
    status: appStatusMap.running,
    createTime: 'string',
    cpu: 100,
    memory: 100,
    isPause: false,
    usedCpu: {
      name: '',
      xData: new Array(30).fill(0),
      yData: new Array(30).fill('0')
    },
    usedMemory: {
      name: '',
      xData: new Array(30).fill(0),
      yData: new Array(30).fill('0')
    },
    activeReplicas: 1,
    maxReplicas: 1,
    minReplicas: 1,
    storeAmount: 0,
    labels: {},
    source: {
      hasSource: false,
      sourceName: '',
      sourceType: 'app_store'
    }
  },
  {
    id: 'string3',
    name: 'string',
    status: appStatusMap.running,
    createTime: 'string',
    isPause: false,
    cpu: 100,
    memory: 100,
    usedCpu: {
      name: '',
      xData: new Array(30).fill(0),
      yData: new Array(30).fill('0')
    },
    usedMemory: {
      name: '',
      xData: new Array(30).fill(0),
      yData: new Array(30).fill('0')
    },
    activeReplicas: 1,
    maxReplicas: 1,
    minReplicas: 1,
    storeAmount: 0,
    labels: {},
    source: {
      hasSource: false,
      sourceName: '',
      sourceType: 'app_store'
    }
  }
];
export const MOCK_NAMESPACE = 'ns-34dccadb-8e62-4205-8c1b-fc2dc146cd68';

export const MOCK_DEPLOY = `
apiVersion: v1
kind: ServiceAccount
metadata:
  name: desktop-app-demo
  namespace:
---
apiVersion: v1
kind: Service
metadata:
  name: desktop-app-demo
  namespace: ns-34dccadb-8e62-4205-8c1b-fc2dc146cd68
spec:
  ports:
    - port: 3000
  selector:
    app: desktop-app-demo
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: desktop-app-demo-config
  namespace: ns-34dccadb-8e62-4205-8c1b-fc2dc146cd68
data:
  config.yaml: |-
    addr: :3000
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: desktop-app-demo
  namespace: ns-34dccadb-8e62-4205-8c1b-fc2dc146cd68
spec:
  selector:
    matchLabels:
      app: desktop-app-demo
  strategy:
    type: Recreate
  template:
    metadata:
      labels:
        app: desktop-app-demo
    spec:
      serviceAccountName: desktop-app-demo
      containers:
        - name: desktop-app-demo
          securityContext:
            runAsNonRoot: true
            runAsUser: 1001
            allowPrivilegeEscalation: false
            capabilities:
              drop:
                - "ALL"
          image: c121914yu/desktop-app-demo
          resources:
            requests:
              cpu: 30m
              memory: 300Mi
            limits:
              cpu: 30m
              memory: 300Mi
          imagePullPolicy: Always
          volumeMounts:
            - name: desktop-app-demo-volume
              mountPath: /config.yaml
              subPath: config.yaml
      volumes:
        - name: desktop-app-demo-volume
          configMap:
            name: desktop-app-demo-config
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  annotations:
    kubernetes.io/ingress.class: nginx
    nginx.ingress.kubernetes.io/ssl-redirect: "false"
    nginx.ingress.kubernetes.io/backend-protocol: "HTTP"
  name: desktop-app-demo
  namespace: ns-34dccadb-8e62-4205-8c1b-fc2dc146cd68
spec:
  rules:
    - host: app-test.cloud.sealos.io
      http:
        paths:
          - pathType: Prefix
            path: /
            backend:
              service:
                name: desktop-app-demo
                port:
                  number: 3000
  tls:
    - hosts:
        - app-test.cloud.sealos.io
      secretName: wildcard-cloud-sealos-io-cert
`;

export const MOCK_PODS: PodDetailType[] = [
  {
    podName: '1',
    nodeName: 'dafda-fasd-fas',
    ip: '311.241.41.41',
    restarts: 10,
    age: '22',
    status: podStatusMap.running,
    usedCpu: {
      name: '',
      xData: new Array(30).fill(0),
      yData: new Array(30).fill('0')
    },
    usedMemory: {
      name: '',
      xData: new Array(30).fill(0),
      yData: new Array(30).fill('0')
    },
    cpu: 0,
    memory: 0,
    containerStatus: podStatusMap.running
  },
  {
    podName: '2',
    nodeName: 'dafda-fasd-fas',
    ip: '311.241.41.41',
    restarts: 10,
    age: '22',
    status: podStatusMap.running,
    usedCpu: {
      name: '',
      xData: new Array(30).fill(0),
      yData: new Array(30).fill('0')
    },
    usedMemory: {
      name: '',
      xData: new Array(30).fill(0),
      yData: new Array(30).fill('0')
    },
    cpu: 0,
    memory: 0,
    containerStatus: podStatusMap.running
  }
];

export const MOCK_APP_DETAIL: AppDetailType = {
  kind: 'deployment',
  volumes: [],
  volumeMounts: [],
  crYamlList: [],
  id: '4bd50c41-149e-4da5-89d5-0308b9dd75c6',
  createTime: '2022/1/22',
  status: appStatusMap.waiting,
  isPause: false,
  appName: 'appName',
  imageName: 'nginx',
  runCMD: '',
  cmdParam: '',
  replicas: 5,
  cpu: 0,
  memory: 0,
  usedCpu: {
    name: '',
    xData: new Array(30).fill(0),
    yData: new Array(30).fill('0')
  },
  usedMemory: {
    name: '',
    xData: new Array(30).fill(0),
    yData: new Array(30).fill('0')
  },
  networks: [
    {
      networkName: '',
      portName: nanoid(),
      port: 80,
      protocol: 'TCP',
      openPublicDomain: false,
      publicDomain: '',
      customDomain: '',
      domain: '',
      appProtocol: 'HTTP',
      openNodePort: false
    }
  ],
  envs: [],
  hpa: {
    use: false,
    target: 'cpu',
    value: 50,
    minReplicas: 1,
    maxReplicas: 1
  },
  configMapList: [],
  secret: {
    use: false,
    username: '',
    password: '',
    serverAddress: ''
  },
  storeList: [],
  labels: {},
  source: {
    hasSource: false,
    sourceName: '',
    sourceType: 'app_store'
  }
};

export const MockAppEditSyncedFields: AppEditSyncedFields = {
  imageName: 'nginx',
  appName: 'hello-world-test',
  replicas: 1,
  cpu: 4000,
  memory: 64,
  networks: [
    {
      networkName: 'network-atyjahgvtzqm',
      portName: 'vsjrpjzjptex',
      port: 80,
      protocol: 'TCP',
      openPublicDomain: true,
      publicDomain: 'tkywzlpibxdl',
      customDomain: '',
      domain: 'gzg.sealos.run',
      appProtocol: 'HTTP',
      openNodePort: false
    }
  ],
  cmdParam: 'sleep 10',
  runCMD: '/bin/bash -c',
  labels: {}
};
