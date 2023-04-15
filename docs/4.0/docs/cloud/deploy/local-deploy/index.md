# Local deployment of selaos cloud

## Preparation

1. A ready Kubernetes cluster, which can be deployed using sealos.    
    - Refer to [Kubernetes life cycle management](https://github.com/labring/sealos/tree/main/docs/4.0/docs/getting-started/kuberentes-life-cycle.md)
      ```shell
      sealos run labring/kubernetes:v1.25.0 labring/helm:v3.8.2 labring/calico:v3.24.1 \
      --masters 192.168.64.2,192.168.64.22,192.168.64.20 \
      --nodes 192.168.64.21,192.168.64.19 -p [your-ssh-passwd]
      ```
    -  If you need to customize a Kubernetes cluster, such as customizing `podCidr`，you can use the following command, please refer to [Customize a Cluster](https://sealos.io/docs/getting-started/customize-cluster) for details:
       ```shell
       sealos gen labring/kubernetes:v1.25.6 labring/helm:v3.10.0 labring/calico:v3.25.0 \
       --masters 192.168.64.2,192.168.64.22,192.168.64.20 \
       --nodes 192.168.64.21,192.168.64.19 -p [your-ssh-passwd] > Clusterfile
       ```
        Modify the relevant configuration in `Clusterfile` and then execute:
       ```shell
       sealos apply -f Clusterfile
       ```
2. You need to have a domain name and resolve it to sealos cluster's nodes, assuming the domain name is `domain.io`. You also need to sign certificates for `domain.io` and `*.domain.io`.

## Deployment steps

1. Assuming you have deployed the most basic Kubernetes cluster using sealos, you still need to install the following components using sealos:
   - labring/openebs:v3.4.0
   - labring/cert-manager:v1.8.0
     Refer to the command:
    > sealos run labring/openebs:v3.4.0 labring/cert-manager:v1.8.0

2. To expose the network externally, you need to install the `ingerss-nginx` component.
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

3. Install reflector.
    ```shell
    helm repo add emberstack https://emberstack.github.io/helm-charts
    helm repo update
    helm upgrade --install reflector emberstack/reflector -n kube-system
    ```
   
4. Generate your certificate as a Kubernetes tls secret.
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
5. Deploy the `casdoor & auth-service` component.
6. Deploy the `desktop` component.
7. Deploy the `app` component.
8. Deploy the `user` component.
9. Deploy the `terminal` application.
10. Deploy the `deploy-manager` application.