export const MOCK_YAML = `
apiVersion: apps/v1
kind: Template
metadata: 
  name: FastGpt
spec:
  title: 'FastGpt'
  url: 'https://wordpress.org'
  readme: 'https://api.github.com/repos/c121914yu/FastGPT/readme'
  icon: './wordpress.svg'
  template_type: inline
  defaults:
    ingress_name:
      type: string
      value: {{ random }}
    root_password:
      type: string
      value: {{ random }}
  inputs:
    volume_size:
      description: 'save data size (Gi)'
      type: string
      default: '1'
      required: false  
    mail:
      description: 'your email address'
      type: string
      default: ''
      required: true
    mail_code:
      description: 'mail_code'
      type: string
      default: ''
      required: true
    OPENAIKEY:
      description: 'openai configuration'
      type: string
      default: ''
      required: true
    OPENAI_TRAINING_KEY:
      description: 'openai configuration'
      type: string
      default: ''
      required: true
    GPT4KEY:
      description: 'openai configuration'
      type: string
      default: ''
      required: true
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: fastgpt
  annotations:
    originImageName: registry.cn-hangzhou.aliyuncs.com/fastgpt/fastgpt:latest
    deploy.cloud.sealos.io/minReplicas: '1'
    deploy.cloud.sealos.io/maxReplicas: '1'
  labels:
    cloud.sealos.io/app-deploy-manager: fastgpt
    app: fastgpt
spec:
  replicas: 1
  revisionHistoryLimit: 1
  selector:
    matchLabels:
      app: fastgpt
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1
      maxSurge: 0
  template:
    metadata:
      labels:
        app: fastgpt
    spec:
      containers:
        - name: fastgpt
          image: registry.cn-hangzhou.aliyuncs.com/fastgpt/fastgpt:latest
          env:
            - name: QA_MAX_PROCESS
              value: '20'
            - name: VECTOR_MAX_PROCESS
              value: '20'
            - name: MY_MAIL
              value: {{ inputs.mail }}
            - name: MAILE_CODE
              value: {{ inputs.mail_code }}
            - name: TOKEN_KEY
              value: tokenkey
            - name: ROOT_KEY
              value: rootkey
            - name: SENSITIVE_CHECK
              value: '1'
            - name: MONGODB_URI
              value: >-
                mongodb://root:{{ defaults.root_password }}@fastgpt-mongo.{{ SEALOS_NAMESPACE}}.svc:27017
            - name: MONGODB_NAME
              value: fastgpt
            - name: PG_USER
              value: root
            - name: PG_PASSWORD
              value: {{ defaults.root_password }}
            - name: PG_HOST
              value: fastgpt-pg.{{ SEALOS_NAMESPACE}}.svc
            - name: PG_PORT
              value: '5432'
            - name: PG_DB_NAME
              value: fastgpt
            - name: OPENAIKEY
              value: {{ inputs.OPENAIKEY }}
            - name: OPENAI_TRAINING_KEY
              value: {{ inputs.OPENAI_TRAINING_KEY }}
            - name: GPT4KEY
              value: {{ inputs.GPT4KEY }}
          resources:
            requests:
              cpu: 100m
              memory: 102Mi
            limits:
              cpu: 1000m
              memory: 1024Mi
          command: []
          args: []
          ports:
            - containerPort: 80
          imagePullPolicy: Always
          volumeMounts: []
      volumes: []

---
apiVersion: v1
kind: Service
metadata:
  name: fastgpt
  labels:
    cloud.sealos.io/app-deploy-manager: fastgpt
spec:
  ports:
    - port: 80
  selector:
    app: fastgpt

---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: fastgpt
  labels:
    cloud.sealos.io/app-deploy-manager: fastgpt
    cloud.sealos.io/app-deploy-manager-domain: {{ defaults.ingress_name }}
  annotations:
    kubernetes.io/ingress.class: nginx
    nginx.ingress.kubernetes.io/proxy-body-size: 32m
    nginx.ingress.kubernetes.io/server-snippet: |
      client_header_buffer_size 64k;
      large_client_header_buffers 4 128k;
    nginx.ingress.kubernetes.io/ssl-redirect: 'false'
    nginx.ingress.kubernetes.io/backend-protocol: HTTP
    nginx.ingress.kubernetes.io/rewrite-target: /$2
    nginx.ingress.kubernetes.io/client-body-buffer-size: 64k
    nginx.ingress.kubernetes.io/proxy-buffer-size: 64k
    nginx.ingress.kubernetes.io/configuration-snippet: |
      if ($request_uri ~* \.(js|css|gif|jpe?g|png)) {
        expires 30d;
        add_header Cache-Control "public";
      }
spec:
  rules:
    - host: {{ defaults.ingress_name }}.cloud.sealos.io
      http:
        paths:
          - pathType: Prefix
            path: /()(.*)
            backend:
              service:
                name: fastgpt
                port:
                  number: 80
  tls:
    - hosts:
        - {{ defaults.ingress_name }}.cloud.sealos.io
      secretName: wildcard-cloud-sealos-io-cert

---
apiVersion: apps.kubeblocks.io/v1alpha1
kind: Cluster
metadata:
  finalizers:
    - cluster.kubeblocks.io/finalizer
  labels:
    clusterdefinition.kubeblocks.io/name: mongodb
    clusterversion.kubeblocks.io/name: mongodb-5.0.14
    sealos-db-provider-cr: fastgpt-mongo
  annotations: {}
  name: fastgpt-mongo
  generation: 1
spec:
  affinity:
    nodeLabels: {}
    podAntiAffinity: Preferred
    tenancy: SharedNode
    topologyKeys: []
  clusterDefinitionRef: mongodb
  clusterVersionRef: mongodb-5.0.14
  componentSpecs:
    - componentDefRef: mongodb
      monitor: true
      name: mongodb
      replicas: 1
      resources:
        limits:
          cpu: 1000m
          memory: 1024Mi
        requests:
          cpu: 100m
          memory: 102Mi
      serviceAccountName: fastgpt-mongo
      volumeClaimTemplates:
        - name: data
          spec:
            accessModes:
              - ReadWriteOnce
            resources:
              requests:
                storage: 1Gi
            storageClassName: openebs-backup
      connection:
        user: root
        password: {{ defaults.root_password }} 
        port: 27017
        dbname: fastgpt  
  terminationPolicy: Delete
  tolerations: []
---
apiVersion: v1
kind: ServiceAccount
metadata:
  labels:
    sealos-db-provider-cr: fastgpt-mongo
    app.kubernetes.io/instance: fastgpt-mongo
    app.kubernetes.io/managed-by: kbcli
  name: fastgpt-mongo

---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  labels:
    sealos-db-provider-cr: fastgpt-mongo
    app.kubernetes.io/instance: fastgpt-mongo
    app.kubernetes.io/managed-by: kbcli
  name: fastgpt-mongo
rules:
  - apiGroups:
      - ''
    resources:
      - events
    verbs:
      - create

---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  labels:
    sealos-db-provider-cr: fastgpt-mongo
    app.kubernetes.io/instance: fastgpt-mongo
    app.kubernetes.io/managed-by: kbcli
  name: fastgpt-mongo
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: fastgpt-mongo
subjects:
  - kind: ServiceAccount
    name: fastgpt-mongo
    namespace: {{ SEALOS_NAMESPACE}}


---
apiVersion: apps.kubeblocks.io/v1alpha1
kind: Cluster
metadata:
  finalizers:
    - cluster.kubeblocks.io/finalizer
  labels:
    clusterdefinition.kubeblocks.io/name: postgresql
    clusterversion.kubeblocks.io/name: postgresql-14.8.0
    sealos-db-provider-cr: fastgpt-pg
  annotations: {}
  name: fastgpt-pg
spec:
  affinity:
    nodeLabels: {}
    podAntiAffinity: Preferred
    tenancy: SharedNode
    topologyKeys: []
  clusterDefinitionRef: postgresql
  clusterVersionRef: postgresql-14.8.0
  componentSpecs:
    - componentDefRef: postgresql
      monitor: true
      name: postgresql
      replicas: 1
      resources:
        limits:
          cpu: 1000m
          memory: 1024Mi
        requests:
          cpu: 100m
          memory: 102Mi
      serviceAccountName: fastgpt-pg
      switchPolicy:
        type: Noop
      volumeClaimTemplates:
        - name: data
          spec:
            accessModes:
              - ReadWriteOnce
            resources:
              requests:
                storage: 3Gi
            storageClassName: openebs-backup
      connection:
        user: root
        password: {{ defaults.root_password }}  
        port: 5432
        dbname: fastgpt
        sql:
          CREATE EXTENSION IF NOT EXISTS vector;
          CREATE TABLE IF NOT EXISTS modelData (
              id BIGSERIAL PRIMARY KEY,
              vector VECTOR(1536) NOT NULL,
              user_id VARCHAR(50) NOT NULL,
              kb_id VARCHAR(50) NOT NULL,
              source VARCHAR(100),
              q TEXT NOT NULL,
              a TEXT NOT NULL
          );
          CREATE INDEX IF NOT EXISTS modelData_userId_index ON modelData USING HASH (user_id);
          CREATE INDEX IF NOT EXISTS modelData_kbId_index ON modelData USING HASH (kb_id);
          CREATE INDEX IF NOT EXISTS idx_model_data_md5_q_a_user_id_kb_id ON modelData (md5(q), md5(a), user_id, kb_id);
          CREATE INDEX IF NOT EXISTS vector_index  ON modeldata USING ivfflat (vector vector_ip_ops) WITH (lists = 100);
          SET ivfflat.probes = 10;         
  terminationPolicy: Delete
  tolerations: []
---
apiVersion: v1
kind: ServiceAccount
metadata:
  labels:
    sealos-db-provider-cr: fastgpt-pg
    app.kubernetes.io/instance: fastgpt-pg
    app.kubernetes.io/managed-by: kbcli
  name: fastgpt-pg

---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  labels:
    sealos-db-provider-cr: fastgpt-pg
    app.kubernetes.io/instance: fastgpt-pg
    app.kubernetes.io/managed-by: kbcli
  name: fastgpt-pg
rules:
  - apiGroups:
      - ''
    resources:
      - events
    verbs:
      - create
  - apiGroups:
      - ''
    resources:
      - configmaps
    verbs:
      - create
      - get
      - list
      - patch
      - update
      - watch
      - delete
  - apiGroups:
      - ''
    resources:
      - endpoints
    verbs:
      - create
      - get
      - list
      - patch
      - update
      - watch
      - delete
  - apiGroups:
      - ''
    resources:
      - pods
    verbs:
      - get
      - list
      - patch
      - update
      - watch

---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  labels:
    sealos-db-provider-cr: fastgpt-pg
    app.kubernetes.io/instance: fastgpt-pg
    app.kubernetes.io/managed-by: kbcli
  name: fastgpt-pg
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: fastgpt-pg
subjects:
  - kind: ServiceAccount
    name: fastgpt-pg
    namespace: {{ SEALOS_NAMESPACE}}
`;
