# Terminal CRD
```yaml
apiVersion: terminal.sealos.io/v1
kind: Terminal
metadata:
  name: terminal-sample
spec:
  user: ccl
  token: abcdefg
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