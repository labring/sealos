# 使用cname自定义域名访问案例

本文档描述了如何使用自定义域名来访问sealos cloud下的服务.

## Pre-requirement

1. 一个 [sealos cloud](https://cloud.sealos.io) 账号.
2. 一个已经在 sealos cloud 上运行的服务, 本教程中使用 hello-world 样例.
3. 一个 sealos cloud 已经提供的url, 指向上述的服务, 本教程中假设为 `https://example.cloud.sealos.io`
4. 一个自有的域名, 假设为 `sealos.example.com`, 同时拥有其 https 证书.

## 步骤

* 创建一个 **cname 记录** 从自定义的域名 `sealos.example.com`, 指向已经提供的url地址: `example.cloud.sealos.io`.
* 创建一个 **secret yaml** 来存储自定义域名的证书信息.

    ```yaml title="secret.yaml"
    apiVersion: v1
    kind: Secret
    metadata:
      name: sealos-example-com-ca-key-pair
      namespace: ns-1234567890abcdef
    data:
      tls.crt: 1234567890abcdef==
      tls.key: 1234567890abcdef==
    ```
    **注意**: 命名空间要与账号的命名空间一致. `tls.crt` 与 `tls.key` 需要 base64 编码.

    可以使用 `cat crt.pem | base64 -w0` 命令来编码已有的证书与 key 文件为 base64 格式.

* 创建一个 **CA issuer** 来使用刚才创建的密码.

    ```yaml title="issuer.yaml"
    apiVersion: cert-manager.io/v1
    kind: Issuer
    metadata:
      name: sealos-example-com-ca-issuer
      namespace: ns-1234567890abcdef
    spec:
      ca:
        secretName: sealos-example-com-ca-key-pair
    ```
* 创建一个 **ingress nginx** 来导出服务可访问.

    ```yaml title="ingress.yaml"
    apiVersion: networking.k8s.io/v1
    kind: Ingress
    metadata:
      annotations:
        kubernetes.io/ingress.class: nginx
        cert-manager.io/issuer: sealos-example-com-ca-issuer
      name: sealos-example-com-cname
      namespace: ns-1234567890abcdef
    spec:
      rules:
        - host: sealos.example.com
          http:
            paths:
              - pathType: Prefix
                path: /
                backend:
                  service:
                    name: my-svc 
                    port:
                      number: 8080
      tls:
        - hosts:
            - sealos.example.com
          secretName: sealos-example-com-ca-key-pair
    ```

**完成**