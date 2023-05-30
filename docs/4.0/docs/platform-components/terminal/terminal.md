# Cloud terminal tutorial

Cloud terminal is a web terminal running in the container, 
and the user's .kube/config has been configured in the terminal.

It also contains some commonly used commands, 
which can be used to access almost all APIs of applications that sealos provides.

Tips: Currently, persistent files are not supported in the terminal. Remember to back up your files edited in the terminal.

## Access api server

Kubectl has been installed in the terminal, and the user's kubeconfig has also been configured.

```shell
root@thpqxr0bh:~# kubectl get pod
NAME                                                             READY   STATUS    RESTARTS   AGE
acid-test-0                                                      1/1     Running   0          37m
terminal-8b66134e-5294-480f-b6c4-00243fc2488e-5cdc66697c-d5tss   1/1     Running   0          40m
```

.kube/config:

```shell
root@thpqxr0bh:~# cat .kube/config 
apiVersion: v1
clusters:
- cluster:
    server: https://kubernetes.default.svc.cluster.local:443
  name: kubernetes
contexts:
- context:
    cluster: kubernetes
    user: 8b66134e-5294-480f-b6c4-00243fc2488e
    namespace: ns-8b66134e-5294-480f-b6c4-00243fc2488e
  name: 8b66134e-5294-480f-b6c4-00243fc2488e
current-context: 8b66134e-5294-480f-b6c4-00243fc2488e
kind: Config
preferences: {}
users:
- name: 8b66134e-5294-480f-b6c4-00243fc2488e
  user:
    token: eyJhbGciOiJSUzI1NiIsImtpZCI6IjItUWxyLUc3X0FiNjF...
```

You can access the api server remotely (e.g. using your local terminal) by changing the server address to https://cloud.sealos.io:6443.
To integrate into any CI/CD system, just copy the file content to the client's ~.kube/config directory.

## Access Control

When you try to list cluster nodes:

```shell
root@thpqxr0bh:~# kubectl get node
Error from server (Forbidden): nodes is forbidden: 
User "system:serviceaccount:user-system:8b66134e-5294-480f-b6c4-00243fc2488e" 
cannot list resource "nodes" in API group "" at the cluster scope
```

Users do not have permission to access the information.

## Access other resources

You can access the database instances or the multi-cluster provided by sealos cloud provider through the terminal.

```shell
root@thpqxr0bh:~# kubectl get infra
NAME    STATUS    AGE     AZ
aaa     Running   3d23h   cn-north-1b
fanux   Running   4d3h    cn-north-1b
test    Running   13d     cn-north-1b
root@thpqxr0bh:~# kubectl get cluster
NAME    AGE
aaa     3d23h
fanux   4d3h
test    13d
root@thpqxr0bh:~# kubectl get infra
NAME    STATUS    AGE     AZ
aaa     Running   3d23h   cn-north-1b
fanux   Running   4d3h    cn-north-1b
test    Running   13d     cn-north-1b
```

Of course, you can also delete or edit these resources.

## Debugging

Terminal is also a perfect debugging tool, 
because it is essentially a pod running under the user ns, 
and it comes with many network tools.

```shell
root@thpqxr0bh:~# nslookup acid-test
Server:         10.96.0.10
Address:        10.96.0.10#53

Name:   acid-test.ns-8b66134e-5294-480f-b6c4-00243fc2488e.svc.cluster.local
Address: 10.96.2.134

root@thpqxr0bh:~# ping 10.96.2.134
PING 10.96.2.134 (10.96.2.134) 56(84) bytes of data.
64 bytes from 10.96.2.134: icmp_seq=1 ttl=64 time=0.048 ms
64 bytes from 10.96.2.134: icmp_seq=2 ttl=64 time=0.069 ms
```

## You can even write code in the terminal

![img_1.png](go-code-terminal.png)
```shell
root@thpqxr0bh:~# vim main.go
root@thpqxr0bh:~# go run main.go 
hello sealos!
```