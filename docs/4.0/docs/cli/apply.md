# Apply cluster using Clusterfile

```shell
$ sealos apply -f Clusterfile
```

## Experimental

`Clusterfile` can also be written using go-template syntax(just like [helm](https://helm.sh/)! but some template functions are missing, like `include`/`tpl`/`require`/`lookup`). for example, we create a file named `Clusterfile.yaml`

```yaml
apiVersion: apps.sealos.io/v1beta1
kind: Cluster
metadata:
  name: {{ .Values.clusterName }}
spec:
  hosts:
    - ips: {{ .Values.masters | toYaml | nindent 8 }}
      roles: ["master", "amd64"]
    {{- with .Values.nodes }}
    - ips: {{ . | toYaml | nindent 8 }}
      roles: ["node", "amd64"]
    {{- end }}
  image: {{ .Values.images | toYaml | nindent 4 }}
  ssh:
    passwd: {{ env "SSH_PASSWORD" .Values.ssh.passwd }}
    pk: {{ default "~/.ssh/id_rsa" .Values.ssh.pk }}
    port: {{ default 22 .Values.ssh.port | int }}
    user: {{ default "root" .Values.ssh.user }}
---
apiVersion: kubeadm.k8s.io/v1beta3
kind: ClusterConfiguration
networking:
  dnsDomain: {{ default "cluster.local" .Values.networking.dnsDomain }}
  serviceSubnet: {{ default "10.96.0.0/18" .Values.networking.serviceSubnet }}
  podSubnet: {{ default "100.64.0.0/17" .Values.networking.podSubnet }}
```

Then we create a customized values file named `example.values.yaml`

```yaml
clusterName: default
images:
  - dockerhub.tencentcloudcr.com/labring/kubernetes:v1.23.8
  - dockerhub.tencentcloudcr.com/labring/calico:v3.24.1
masters:
  - 10.74.16.27:22
  - 10.74.16.140:22
  - 10.74.16.101:22
nodes: []
ssh:
  # passwd: notSetYet
  pk: /path/to/private/key/file
  port: 22
  user: root
networking:
  dnsDomain: cluster.local
  serviceSubnet: 10.96.0.0/18
  podSubnet: 100.64.0.0/17
```

Now we can apply a new cluster with command

```shell
$ sealos apply -f Clusterfile.yaml --values example.values.yaml --set clusterName=testlocal --env SSH_PASSWORD=s3cret 
```

Works like a charm!
