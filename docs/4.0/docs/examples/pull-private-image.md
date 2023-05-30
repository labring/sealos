# pull private image tutorial on sealos cloud 

this docs teach you how to run private image pod in sealos cloud

## create docker hub secret on sealos cloud 

```
kubectl create secret docker-registry regcred \
  --docker-server=<your docker-server> \ //docker hub is https://index.docker.io/v1/ 
  --docker-username=<your username> \
  --docker-password=<your password> \
  --docker-email=<your email>
```



## create pod

### push a image and change it from public to private on docker hub

```
docker pull hellodm/my-first-demo:v1.0
docker tag 375fb2abe5d4 xiaojie99999/my-first-demo:v1.0
docker push xiaojie99999/my-first-demo:v1.0
```



### apply this yaml on sealos cloud terminal to create a pod

```
apiVersion: v1
kind: Pod
metadata:
  name: my-first-demo
  labels:
    app: my-first-demo
spec:
  containers:
    - name: my-first-demo
      image: xiaojie99999/my-first-demo:v1.0
      ports:
        - containerPort: 80
      resources:
        requests:
          cpu: 0.1
          memory: 32Mi
        limits:
          cpu: 0.5
          memory: 32Mi
  imagePullSecrets:
  - name: regcred
```

## result

```
root@t5bha6vem:~# kubectl get pod 
NAME                                                             READY   STATUS             RESTARTS        AGE
my-first-demo                                                    1/1     Running            0               8m56s
```



