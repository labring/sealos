# Build a Service Image from Private Registry

## Build Service Image

### Install helm

[https://github.com/helm/helm/releases](https://github.com/helm/helm/releases)

Install helm v3.9.

### Login to private registry

Make sure sealos have permissions to pull docker image from registry:

```shell
sealos login registry.cn-hangzhou.aliyuncs.com -u username -p password
```

### Modify helm chart

Download helm chart template:

```shell
git clone https://github.com/luanshaotong/scienson_osm.git
```

```yaml title="templates/deploy.yaml"
apiVersion: apps/v1
kind: Deployment
metadata:
  labels:
    run: avatarsolver-osm
  name: avatarsolver-osm
spec:
  replicas: { { .Values.osm.replicas } }
  selector:
    matchLabels:
      run: avatarsolver-osm
  template:
    metadata:
      labels:
        run: avatarsolver-osm
    spec:
      containers:
        - image: registry.cn-hangzhou.aliyuncs.com/scienson/avatarsplver-osm:2022-07-11-21-05
          name: app
          ports:
            - containerPort: 7001
              protocol: TCP
            - containerPort: 8080
              protocol: TCP
          resources:
            limits:
              cpu: 2
              memory: 6144Mi
            requests:
              cpu: 1
              memory: 4096Mi
```

```yaml title="templates/service.yaml"
apiVersion: v1
kind: Service
metadata:
  name: osm-service
spec:
  type: ClusterIP
  selector:
    run: avatarsolver-osm
  ports:
    - name: osm
      port: 7001
      targetPort: 7001
```

Expose service outside the cluster:

```yaml title="templates/ingress.yaml"
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: osm-ingress
spec:
  ingressClassName: nginx
  rules:
    - host: www.abc.com
      http:
        paths:
          - pathType: Prefix
            path: /
            backend:
              service:
                name: osm-service
                port:
                  number: 80
```

Render replicas of the service:

```yaml title="values.yaml"
osm:
  replicaCount: 1
```

### Package helm chart

```shell
helm package .
```

![image](https://user-images.githubusercontent.com/14962503/179480436-aa3fcf60-a89c-4f84-bb92-c5762f64d91a.png)

### Modify image list

```shell
cat images/shim/osm
registry.cn-hangzhou.aliyuncs.com/scienson/avatarsplver-osm:2022-07-11-21-05
```

### Modify Dockerfile

```dockerfile
FROM scratch
COPY . .
CMD ["helm install osm scienson-osm-0.1.1.tgz --namespace osm --create-namespace"]
```

![image](https://user-images.githubusercontent.com/14962503/179480360-87b813a6-de85-4829-a801-3cd82cd8f604.png)

### Build image

```shell
sealos build -f Dockerfile -t docker.io/luanshaotong/osm:v0.1.1 .
```

## Deploy for test

```shell
sealos run labring/kubernetes:v1.25.0 labring/helm:v3.8.2 labring/calico:v3.24.1  --masters 172.31.37.111
kubectl taint no node-role.kubernetes.io/master:NoSchedule-
kubectl taint no node-role.kubernetes.io/control-plane:NoSchedule-
sealos run labring/ingress-nginx:4.1.0
sealos run docker.io/luanshaotong/osm:v0.1.1
```

If the installation failed, you may need to clean the cluster and reinstall.

## Appendix

### Clean cluster

You may need to clean the cluster before reinstall.

```shell
sealos reset
rm /root/.sealos -rf
```
