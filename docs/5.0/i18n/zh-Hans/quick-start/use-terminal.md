---
sidebar_position: 3
---

# 使用终端

熟悉 Kubernetes 和容器基础知识的用户可以选择使用「[终端](/guides/terminal/terminal.md)」命令行来部署应用。本文以 Nginx 为例，介绍如何使用终端来部署应用。

首先在 [Sealos](https://cloud.sealos.run) 桌面环境中打开终端 App。

![](./images/app-launchpad-1.jpg)

打开终端 App 之后，会默认给您分配一个终端窗口，您可以在终端窗口中进行各种命令行操作。

![](./images/terminal.png)

① 先创建一个 Nginx Deployment 的部署清单：

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx
  labels:
    app: nginx
spec:
  replicas: 1
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: nginx:1.14.2
        ports:
        - containerPort: 80
        resources:
          requests:
            cpu: 0.2
            memory: 32Mi
          limits:
            cpu: 0.2
            memory: 32Mi
```

② 再创建一个 Nginx Service 的部署清单：

```yaml
# service.yaml
apiVersion: v1
kind: Service
metadata:
  name: nginx
  labels:
    app: nginx
spec:
  type: ClusterIP
  ports:
    - port: 80
      targetPort: 80

  selector:
    app: nginx
```

③ 执行以下命令通过部署清单创建 Deployment 和 Service：

```bash
kubectl apply -f deployment.yaml
kubectl apply -f service.yaml
```

测试是否能正常访问 Nginx：

```bash
$ kubectl get pod -l app=nginx
NAME                     READY   STATUS    RESTARTS   AGE
nginx-7546c75fb4-572x9   1/1     Running   0          5m37s

$ kubectl get svc -l app=nginx
NAME    TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)   AGE
nginx   ClusterIP   10.64.204.173   <none>        80/TCP    5m36s

$ curl 10.64.204.173
<!DOCTYPE html>
<html>
<head>
<title>Welcome to nginx!</title>
<style>
    body {
        width: 35em;
        margin: 0 auto;
        font-family: Tahoma, Verdana, Arial, sans-serif;
    }
</style>
</head>
<body>
<h1>Welcome to nginx!</h1>
<p>If you see this page, the nginx web server is successfully installed and
working. Further configuration is required.</p>

<p>For online documentation and support please refer to
<a href="http://nginx.org/">nginx.org</a>.<br/>
Commercial support is available at
<a href="http://nginx.com/">nginx.com</a>.</p>

<p><em>Thank you for using nginx.</em></p>
</body>
</html>
```

④ 如果你想把 Nginx 暴露到外网，并通过外网域名进行访问，还需要创建一个 Ingress 资源。先创建一个部署清单：

```yaml
# ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  annotations:
    kubernetes.io/ingress.class: nginx
    nginx.ingress.kubernetes.io/backend-protocol: HTTP
    nginx.ingress.kubernetes.io/client-body-buffer-size: 64k
    nginx.ingress.kubernetes.io/proxy-body-size: 32m
    nginx.ingress.kubernetes.io/proxy-buffer-size: 64k
    nginx.ingress.kubernetes.io/server-snippet: |
      client_header_buffer_size 64k;
      large_client_header_buffers 4 128k;
    nginx.ingress.kubernetes.io/ssl-redirect: "false"
  name: nginx
spec:
  rules:
  - host: nginx.cloud.sealos.run
    http:
      paths:
      - backend:
          service:
            name: nginx
            port:
              number: 80
        path: /
        pathType: Prefix
  tls:
  - hosts:
    - nginx.cloud.sealos.run
    secretName: wildcard-cloud-sealos-io-cert
```

⑤ 再执行以下命令通过部署清单创建 Ingress 资源：

```bash
$ kubectl apply -f ingress.yaml
```

⑥ 测试是否能通过外网域名正常访问 Nginx：

![](./images/nginx.png)