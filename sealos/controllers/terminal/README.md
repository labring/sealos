# Terminal CRD
```yaml
apiVersion: terminal.sealos.io/v1
kind: Terminal
metadata:
  name: terminal-sample
  annotations:
    lastUpdateTime: "2022-08-09T15:22:49+08:00"
spec:
  user: ccl
  token: abcdefg
  apiServer: https://192.168.49.2:8443
  keepalived: 5h
  ttyImage: ghcr.io/cuisongliu/go-docker-dev:1.18.4
  replicas: 1
  ingressType: nginx
```

TerminalSpec
- user(string)
- token(string)
- keepalived(string) 
- apiServer(string)

  APIServer address of the cluster. Default to "https://kubernetes.default.svc.cluster.local:443"

- ttyImage(string)

    TTY Image Name. 

- replicas(int32)
  
    Number of desired pods in Deployment. 

- ingressType(string)
  
  Ingress Type, `nginx`. Default to `nginx`.

## Usage
1. run `kubectl apply terminal.yaml`
2. run `kubectl get terminal terminal-name -o template --template={{.status.domain}}` to get terminal address.
3. visit terminal address.

## Keep terminal alived

Client should regularly update the `lastUpdateTime` in annotations to keep the terminal alived. The Cluster will delete the terminal if client does not update the annotations after the time that specified in `keepalived` filed in TerminalSpec.
The `lastUpdateTime` follows the [RFC3339 format](https://www.rfc-editor.org/rfc/rfc3339).

## Log
The log module that terminal controller uses is `"sigs.k8s.io/controller-runtime/pkg/log"`, which is the default log module of kubebuilder.
