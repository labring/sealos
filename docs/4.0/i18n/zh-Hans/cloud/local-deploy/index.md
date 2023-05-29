# 本地部署 selaos cloud 

## 准备工作
1. 一个 ready 的 Kubernetes 集群，可以使用sealos部署
   - 详细参考 [Kubernetes life cycle management](https://github.com/labring/sealos/tree/main/docs/4.0/docs/getting-started/kuberentes-life-cycle.md)
      ```shell
      sealos run labring/kubernetes:v1.25.0 labring/helm:v3.8.2 labring/calico:v3.24.1 \
      --masters 192.168.64.2,192.168.64.22,192.168.64.20 \
      --nodes 192.168.64.21,192.168.64.19 -p [your-ssh-passwd]
      ```
   -  如果需要定制 Kubernetes 集群，比如自定义 `podCidr`，可以使用下面的命令，详细参考 [Customize a Cluster](https://sealos.io/docs/getting-started/customize-cluster)
      ```shell
      sealos gen labring/kubernetes:v1.25.6 labring/helm:v3.10.0 labring/calico:v3.25.0 \
      --masters 192.168.64.2,192.168.64.22,192.168.64.20 \
      --nodes 192.168.64.21,192.168.64.19 -p [your-ssh-passwd] > Clusterfile
      ```
      修改 `Clusterfile` 中相关的配置然后执行
      ```shell
      sealos apply -f Clusterfile
      ```
2. 你需要有一个域名并将这个域名解析到 sealos 集群的部分（或者全部）节点 ，假设这个域名为 `domain.io`，同时你还需要为 `domain.io` 和 `*.domain.io` 签署证书

## 部署步骤
1. 假设你使用sealos已经部署了最基础 Kubernetes 集群，你仍需要使用 sealos 安装下面的组件
   - labring/openebs:v3.4.0
   - labring/cert-manager:v1.8.0
   参考命令：
   > sealos run labring/openebs:v3.4.0 labring/cert-manager:v1.8.0

2. 为了对外暴露网络，你需要安装 `ingerss-nginx` 组件
   - sealos run hub.sealos.cn/labring/ingress-nginx:v1.5.1 --config-file ingress-nginx-config.yaml
    ```yaml
    # ingress-nginx-config.yaml
    apiVersion: apps.sealos.io/v1beta1
    kind: Config
    metadata:
      name: ingress-nginx-config
    spec:
    data: |
      controller:
        hostNetwork: true
        kind: DaemonSet
        service:
          type: LoadBalancer
    match: hub.sealos.cn/labring/ingress-nginx:v1.5.1
    path: charts/ingress-nginx/values.yaml
    strategy: merge
    ```
3. 安装 `reflector`
   ```shell
    helm repo add emberstack https://emberstack.github.io/helm-charts
    helm repo update
    helm upgrade --install reflector emberstack/reflector -n kube-system
   ```
4. 将你的证书生成为 Kubernetes tls secret
   ```bash
   # 将证书文件base64编码
   cat /path/to/yout/cert | base64 -w 0
   cat /path/to/your/key | base64 -w 0
   ```
   
   ```yaml
   apiVersion: v1
   data:
     tls.crt: ${your cert base64 val}
     tls.key: ${your key base64 val}
   kind: Secret
   metadata:
     name: wildcard-secret
     namespace: sealos-system
     annotations:
       reflector.v1.k8s.emberstack.com/reflection-allowed: "true"
       # You can add allowed namespace if you need.
       reflector.v1.k8s.emberstack.com/reflection-allowed-namespaces: "sealos,ns-[\\-a-z0-9]*"
       reflector.v1.k8s.emberstack.com/reflection-auto-enabled: "true"
       reflector.v1.k8s.emberstack.com/reflection-auto-namespaces: "sealos,ns-[\\-a-z0-9]*"
   type: kubernetes.io/tls
   ```
5. 部署 `casdoor & auth-service` 组件，参考[how to deploy service auth](https://github.com/labring/sealos/blob/main/service/auth/README.md)
6. 部署 `desktop` 组件
7. 部署 `app` 组件
8. 部署 `user` 组件
9. 部署 `terminal` 应用
10. 部署 `deploy-manager` 应用