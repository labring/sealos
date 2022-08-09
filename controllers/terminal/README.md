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
  ttyImage: fanux/fist-tty-tools:v1.0.0
  replicas: 3 
```

TerminalSpec
- user(string)
- token(string)
- keepalived(string) 
- apiServer(string)

  APIServer address of the cluster. Default to https://apiserver.svc.cluster.local:6443

- ttyImage(string)

    TTY Image Name. 

- replicas(int32)
  
    Number of desired pods in Deployment. 

## Usage
1. run `kubectl apply terminal.yaml`
2. run `kubectl get service serviceName` to get the nodePort that the service expose. The serviceName is same with the terminal name.
3. Visit http://ip:port

## Keep terminal alived

Client should regularly update the `lastUpdateTime` in annotations to keep the terminal alived. The Cluster will delete the terminal if client does not update the annotations after the time that specified in `keepalived` filed in TerminalSpec.
The `lastUpdateTime` follows the [RFC3339 format](https://www.rfc-editor.org/rfc/rfc3339).