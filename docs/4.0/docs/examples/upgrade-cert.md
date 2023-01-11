# Using sealos to upgrade cert


```
Add domain or ip in certs:
    you had better backup old certs first.
	sealos cert --alt-names sealos.io,10.103.97.2,127.0.0.1,localhost
    using "openssl x509 -noout -text -in apiserver.crt" to check the cert
	will update cluster API server cert, you need to restart your API server manually after using sealos cert.

    For example: add an EIP to cert.
    1. sealos cert --alt-names 39.105.169.253
    2. edit .kube/config, set the apiserver address as 39.105.169.253, (don't forget to open the security group port for 6443, if you using public cloud)
    3. kubectl get pod, to check if it works or not

Usage:
  sealos cert [flags]

Flags:
      --alt-names string   add domain or ip in certs, sealos.io or 10.103.97.2
  -c, --cluster string     name of cluster to applied exec action (default "default")
  -h, --help               help for cert

Global Flags:
      --debug                   enable debug logger
      --root string             storage root dir (default "/var/lib/containers/storage")
      --runroot string          storage state dir (default "/run/containers/storage")
      --storage-driver string   storage-driver (default "overlay")
      --storage-opt strings     storage driver option
```



### Usage

```shell
sealos cert --alt-names sealos.io
```

```
root@default-node-0:~# sealos cert --alt-names sealos.io
2023-01-13T01:10:50 info start to generator cert and copy to masters...
2023-01-13T01:10:50 info apiserver altNames : {map[apiserver.cluster.local:apiserver.cluster.local default-node-0:default-node-0 kubernetes:kubernetes kubernetes.default:kubernetes.default kubernetes.default.svc:kubernetes.default.svc kubernetes.default.svc.cluster.local:kubernetes.default.svc.cluster.local localhost:localhost sealos.io:sealos.io] map[10.103.97.2:10.103.97.2 10.96.0.1:10.96.0.1 127.0.0.1:127.0.0.1 192.168.64.63:192.168.64.63 192.168.64.64:192.168.64.64 192.168.64.65:192.168.64.65]}
2023-01-13T01:10:50 info Etcd altnames : {map[default-node-0:default-node-0 localhost:localhost] map[127.0.0.1:127.0.0.1 192.168.64.63:192.168.64.63 ::1:::1]}, commonName : default-node-0
2023-01-13T01:10:50 info sa.key sa.pub already exist
2023-01-13T01:10:51 info start to copy etc pki files to masters
2023-01-13T01:10:51 info start to copy etc pki files to masters
[1/1]copying files to 192.168.64.64:22 100% [===============] (14/22, 3 it/s)2023-01-13T01:10:57 info start to save new kubeadm config...
2023-01-13T01:10:57 info start to upload kubeadm config for inCluster ...
2023-01-13T01:10:57 info src and dst is same path , skip copy /root/.sealos/default/etc/kubeadm-update.yml
[upload-config] Storing the configuration used in ConfigMap "kubeadm-config" in the "kube-system" Namespace
2023-01-13T01:10:57 info delete pod apiserver from crictl
Stopped sandbox f769134500e67
Removed sandbox f769134500e67
192.168.64.64:22: Stopped sandbox 441cb1b319f6d
192.168.64.65:22: Stopped sandbox e67a88ef25d5e
192.168.64.65:22: Removed sandbox e67a88ef25d5e
192.168.64.64:22: Removed sandbox 441cb1b319f6d
[check-expiration] Reading configuration from the cluster...
[check-expiration] FYI: You can look at this config file with 'kubectl -n kube-system get cm kubeadm-config -o yaml'
[check-expiration] Error reading configuration from the Cluster. Falling back to default configuration

CERTIFICATE                EXPIRES                  RESIDUAL TIME   CERTIFICATE AUTHORITY   EXTERNALLY MANAGED
admin.conf                 Dec 19, 2122 14:44 UTC   99y             ca                      no
apiserver                  Dec 19, 2122 17:10 UTC   99y             ca                      no
apiserver-etcd-client      Dec 19, 2122 17:10 UTC   99y             etcd-ca                 no
apiserver-kubelet-client   Dec 19, 2122 17:10 UTC   99y             ca                      no
controller-manager.conf    Dec 19, 2122 14:44 UTC   99y             ca                      no
etcd-healthcheck-client    Dec 19, 2122 17:10 UTC   99y             etcd-ca                 no
etcd-peer                  Dec 19, 2122 17:10 UTC   99y             etcd-ca                 no
etcd-server                Dec 19, 2122 17:10 UTC   99y             etcd-ca                 no
front-proxy-client         Dec 19, 2122 17:10 UTC   99y             front-proxy-ca          no
scheduler.conf             Dec 19, 2122 14:44 UTC   99y             ca                      no

CERTIFICATE AUTHORITY   EXPIRES                  RESIDUAL TIME   EXTERNALLY MANAGED
ca                      Dec 19, 2122 14:44 UTC   99y             no
etcd-ca                 Dec 19, 2122 14:44 UTC   99y             no
front-proxy-ca          Dec 19, 2122 14:44 UTC   99y             no
```

### Verifying the Change

```shell
kubectl -n kube-system get cm kubeadm-config -o yaml
openssl x509 -in /etc/kubernetes/pki/apiserver.crt -text
```

```
root@default-node-0:~# kubectl -n kube-system get cm kubeadm-config -o yaml
apiVersion: v1
data:
  ClusterConfiguration: |
    apiServer:
      certSANs:
      - 127.0.0.1
      - apiserver.cluster.local
      - 10.103.97.2
      - 192.168.64.63
      - 192.168.64.65
      - 192.168.64.64
      - sealos.io
      extraArgs:
        audit-log-format: json
        audit-log-maxage: "7"
        audit-log-maxbackup: "10"
        audit-log-maxsize: "100"
        audit-log-path: /var/log/kubernetes/audit.log
        audit-policy-file: /etc/kubernetes/audit-policy.yml
        authorization-mode: Node,RBAC
        enable-aggregator-routing: "true"
        feature-gates: EphemeralContainers=true
      extraVolumes:
      - hostPath: /etc/kubernetes
        mountPath: /etc/kubernetes
        name: audit
        pathType: DirectoryOrCreate
      - hostPath: /var/log/kubernetes
        mountPath: /var/log/kubernetes
        name: audit-log
        pathType: DirectoryOrCreate
      - hostPath: /etc/localtime
        mountPath: /etc/localtime
        name: localtime
        pathType: File
        readOnly: true
      timeoutForControlPlane: 4m0s
    apiVersion: kubeadm.k8s.io/v1beta3
    certificatesDir: /etc/kubernetes/pki
    clusterName: kubernetes
    controlPlaneEndpoint: apiserver.cluster.local:6443
    controllerManager:
      extraArgs:
        bind-address: 0.0.0.0
        feature-gates: EphemeralContainers=true
      extraVolumes:
      - hostPath: /etc/localtime
        mountPath: /etc/localtime
        name: localtime
        pathType: File
        readOnly: true
    dns: {}
    etcd:
      local:
        dataDir: /var/lib/etcd
        extraArgs:
          listen-metrics-urls: http://0.0.0.0:2381
    imageRepository: registry.k8s.io
    kind: ClusterConfiguration
    kubernetesVersion: v1.25.0
    networking:
      dnsDomain: cluster.local
      podSubnet: 100.64.0.0/10
      serviceSubnet: 10.96.0.0/22
    scheduler:
      extraArgs:
        bind-address: 0.0.0.0
        feature-gates: EphemeralContainers=true
      extraVolumes:
      - hostPath: /etc/localtime
        mountPath: /etc/localtime
        name: localtime
        pathType: File
        readOnly: true
kind: ConfigMap
metadata:
  creationTimestamp: "2023-01-12T14:44:30Z"
  name: kubeadm-config
  namespace: kube-system
  resourceVersion: "14479"
  uid: 21cee0cd-46e7-4d18-9efa-44a56b9d8354
root@default-node-0:~# openssl x509 -in /etc/kubernetes/pki/apiserver.crt -text
Certificate:
    Data:
        Version: 3 (0x2)
        Serial Number: 263378052145780753 (0x3a7b4f167c89811)
        Signature Algorithm: sha256WithRSAEncryption
        Issuer: CN = kubernetes
        Validity
            Not Before: Jan 12 14:44:06 2023 GMT
            Not After : Dec 19 17:10:51 2122 GMT
        Subject: CN = kube-apiserver
        Subject Public Key Info:
            Public Key Algorithm: rsaEncryption
                Public-Key: (2048 bit)
                Modulus:
                    00:c7:df:b6:36:08:6f:a3:92:dc:36:04:af:5b:c4:
                    14:33:13:a8:80:c3:ef:6e:5e:c9:ab:57:3a:33:5b:
                    f3:35:dd:57:1a:f9:28:2d:77:97:1d:51:a5:68:2b:
                    e8:b7:67:cc:33:fb:88:a9:18:0f:fe:3a:fe:a9:10:
                    f3:0d:b9:71:22:fa:da:d4:18:fa:6d:79:2b:ed:bd:
                    20:16:2d:09:43:df:87:ad:c8:d1:0b:9a:bb:74:76:
                    ea:bf:6e:1e:75:b3:06:cd:a2:1b:e1:d1:72:b3:30:
                    a9:27:94:9b:87:ed:2b:29:30:95:40:22:39:54:20:
                    3b:0b:e3:35:fe:79:33:72:70:5f:2e:0a:91:5b:fa:
                    7d:0a:3b:b3:67:ea:48:80:62:81:4a:64:d1:e3:65:
                    b4:02:eb:63:63:c4:71:26:a7:c1:a4:d0:7d:2e:40:
                    e4:4d:69:f7:42:6b:a1:d6:0a:4c:da:ab:a9:b8:c0:
                    df:ab:5e:4c:0c:c5:9c:c5:f0:f8:4f:fe:1c:81:8e:
                    24:a4:b2:11:ac:87:ae:e5:55:b3:15:78:b2:a9:d4:
                    91:8f:af:03:1a:f2:f4:e3:8b:fd:30:c8:60:e7:35:
                    22:1a:5d:a2:04:81:22:38:3f:ed:a2:36:6e:c0:e9:
                    89:0b:fd:e1:6b:93:93:59:0d:3a:de:ed:59:60:29:
                    2c:e5
                Exponent: 65537 (0x10001)
        X509v3 extensions:
            X509v3 Key Usage: critical
                Digital Signature, Key Encipherment
            X509v3 Extended Key Usage:
                TLS Web Server Authentication
            X509v3 Authority Key Identifier:
                70:80:F3:84:D4:BE:63:4A:48:65:CE:8C:6C:B4:F1:47:8E:BE:6F:47
            X509v3 Subject Alternative Name:
                DNS:sealos.io, DNS:kubernetes.default.svc.cluster.local, DNS:default-node-0, DNS:localhost, DNS:kubernetes, DNS:kubernetes.default, DNS:kubernetes.default.svc, DNS:apiserver.cluster.local, IP Address:192.168.64.65, IP Address:192.168.64.64, IP Address:10.96.0.1, IP Address:10.103.97.2, IP Address:192.168.64.63, IP Address:127.0.0.1
    Signature Algorithm: sha256WithRSAEncryption
    Signature Value:
        1f:45:a8:28:4e:84:16:f5:3d:65:db:26:82:4b:3a:68:d1:41:
        9c:2a:ad:38:57:7f:65:78:6d:71:d7:b7:fd:a4:90:96:f5:e1:
        c7:c8:6b:94:df:ba:bc:52:ef:9b:68:2d:db:4c:c9:b7:6a:e4:
        ef:7d:7c:8b:ba:f6:a0:53:26:6e:73:5d:4c:46:06:b3:8f:fa:
        0c:f9:81:20:8e:50:45:8c:11:57:0a:fa:c1:f5:c8:6c:79:3a:
        6d:49:2b:cb:ae:bb:6d:d8:68:9d:c0:1e:17:a0:42:d9:5d:4a:
        c3:30:66:0b:5a:58:7a:c3:c4:bd:c4:f7:3c:29:3d:d8:f9:c2:
        20:3f:e8:28:05:56:0f:75:e1:de:eb:a8:a4:63:70:6e:ff:85:
        70:3e:20:6c:87:99:35:d9:7f:20:d4:7b:2e:a5:13:d2:cf:19:
        d0:49:4d:85:fc:13:e0:b4:a5:b5:4d:ec:41:09:26:68:ed:cd:
        70:97:a5:ee:76:b2:fc:4f:3b:37:b4:e9:c5:27:23:c6:77:5a:
        82:e0:b8:92:6e:4f:e4:2e:29:9e:18:54:34:12:bd:c7:55:9b:
        9f:ce:0f:a8:57:59:7a:12:1a:d0:1c:78:03:40:38:be:89:38:
        3f:11:38:c4:d7:96:f3:d0:61:43:48:d2:09:3c:dc:cb:25:b2:
        8d:5a:ec:9b
-----BEGIN CERTIFICATE-----
MIIDzTCCArWgAwIBAgIIA6e08WfImBEwDQYJKoZIhvcNAQELBQAwFTETMBEGA1UE
AxMKa3ViZXJuZXRlczAgFw0yMzAxMTIxNDQ0MDZaGA8yMTIyMTIxOTE3MTA1MVow
GTEXMBUGA1UEAxMOa3ViZS1hcGlzZXJ2ZXIwggEiMA0GCSqGSIb3DQEBAQUAA4IB
DwAwggEKAoIBAQDH37Y2CG+jktw2BK9bxBQzE6iAw+9uXsmrVzozW/M13Vca+Sgt
d5cdUaVoK+i3Z8wz+4ipGA/+Ov6pEPMNuXEi+trUGPpteSvtvSAWLQlD34etyNEL
mrt0duq/bh51swbNohvh0XKzMKknlJuH7SspMJVAIjlUIDsL4zX+eTNycF8uCpFb
+n0KO7Nn6kiAYoFKZNHjZbQC62NjxHEmp8Gk0H0uQORNafdCa6HWCkzaq6m4wN+r
XkwMxZzF8PhP/hyBjiSkshGsh67lVbMVeLKp1JGPrwMa8vTji/0wyGDnNSIaXaIE
gSI4P+2iNm7A6YkL/eFrk5NZDTre7VlgKSzlAgMBAAGjggEZMIIBFTAOBgNVHQ8B
Af8EBAMCBaAwEwYDVR0lBAwwCgYIKwYBBQUHAwEwHwYDVR0jBBgwFoAUcIDzhNS+
Y0pIZc6MbLTxR46+b0cwgcwGA1UdEQSBxDCBwYIJc2VhbG9zLmlvgiRrdWJlcm5l
dGVzLmRlZmF1bHQuc3ZjLmNsdXN0ZXIubG9jYWyCDmRlZmF1bHQtbm9kZS0wggls
b2NhbGhvc3SCCmt1YmVybmV0ZXOCEmt1YmVybmV0ZXMuZGVmYXVsdIIWa3ViZXJu
ZXRlcy5kZWZhdWx0LnN2Y4IXYXBpc2VydmVyLmNsdXN0ZXIubG9jYWyHBMCoQEGH
BMCoQECHBApgAAGHBApnYQKHBMCoQD+HBH8AAAEwDQYJKoZIhvcNAQELBQADggEB
AB9FqChOhBb1PWXbJoJLOmjRQZwqrThXf2V4bXHXt/2kkJb14cfIa5TfurxS75to
LdtMybdq5O99fIu69qBTJm5zXUxGBrOP+gz5gSCOUEWMEVcK+sH1yGx5Om1JK8uu
u23YaJ3AHhegQtldSsMwZgtaWHrDxL3E9zwpPdj5wiA/6CgFVg914d7rqKRjcG7/
hXA+IGyHmTXZfyDUey6lE9LPGdBJTYX8E+C0pbVN7EEJJmjtzXCXpe52svxPOze0
6cUnI8Z3WoLguJJuT+QuKZ4YVDQSvcdVm5/OD6hXWXoSGtAceANAOL6JOD8ROMTX
lvPQYUNI0gk83Mslso1a7Js=
-----END CERTIFICATE-----
```
