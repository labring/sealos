# 如何在 sealos cloud 上运行 bytebase

如果在 kubernetes 上运行 bytebase, 需要用户准备一个 kubernetes 集群，pgsql 数据库实例，甚至存储驱动, ingress 对外访问。 在 sealos cloud 上可以轻松解决这
些依赖，并快速启动 bytebase.

首先登录 [sealos cloud](https://cloud.sealos.io)

## 创建一个 pgsql 实例

点击 postgres 图标，创建集群即可，[参考文档](https://www.sealos.io/docs/cloud/apps/postgres/)

## 使用 cloud terminal

点击 terminal 图标，直接编写 yaml 文件即可.

需要修改的部分：
1. 启动参数里面的域名，需要修改成用户自己的，且需要与下面 ingress 的配置一致，如 "bytebase.clodu.sealos.io"
2. 启动参数里面数据库访问设置，从 sealos cloud 上启动好的 pgsql 详细信息中复制即可
3. Ingress 里面的域名配置，域名需要唯一

bytebase.yaml:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: bytebase
spec:
  selector:
    matchLabels:
      app: bytebase
  template:
    metadata:
      labels:
        app: bytebase
    spec:
      containers:
        - name: bytebase
          resources:
            requests:
              cpu: 0.1
              memory: 32Mi
            limits:
              cpu: 0.5
              memory: 32Mi
          image: bytebase/bytebase:1.11.0
          imagePullPolicy: Always
          args:
            [
              "--data",
              "/var/opt/bytebase",
              "--external-url",
              "https://bytebase.cloud.sealos.io",
              "--port",
              "8080",
              "--pg",
              "postgresql://test:2pk5Ra2FdqiF8idERi5Tn5yTbvqPslZaYSgw1Qh2y4MljWBkb2OTvpvK4lwmTVXM@acid-test.ns-8b66134e-5294-480f-b6c4-00243fc2488e.svc.cluster.local:5432/sealos",
            ]
          ports:
            - containerPort: 8080
          volumeMounts:
            - name: data
              mountPath: /var/opt/bytebase
          livenessProbe:
            httpGet:
              path: /healthz
              port: 8080
            initialDelaySeconds: 300
            periodSeconds: 300
            timeoutSeconds: 60
      volumes:
        - name: data
          emptyDir: {}
---
apiVersion: v1
kind: Service
metadata:
  name: bytebase-entrypoint
spec:
  type: ClusterIP
  selector:
    app: bytebase
  ports:
    - protocol: TCP
      port: 8080
      targetPort: 8080
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  annotations:
    kubernetes.io/ingress.class: nginx
    nginx.ingress.kubernetes.io/rewrite-target: /
    nginx.ingress.kubernetes.io/backend-protocol: "HTTP"
  name: hello-world
  labels:
    k8s-app: hello-world
spec:
  rules:
    - host: bytebase.cloud.sealos.io
      http:
        paths:
          - pathType: Prefix
            path: /
            backend:
              service:
                name: bytebase-entrypoint
                port:
                  number: 8080
  tls:
    - hosts:
        - bytebase.cloud.sealos.io
      secretName: wildcard-cloud-sealos-io-cert
```

```shell
root@tx3ghqs7m:~# kubectl apply -f bytebase.yaml 
deployment.apps/bytebase configured
service/bytebase-entrypoint unchanged
ingress.networking.k8s.io/hello-world unchanged
```

然后通过设置的公网二级域名即可访问 bytebase, 如 https://bytebase.cloud.sealos.io