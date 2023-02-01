# How to run bytebase on sealos cloud

If you run bytebase on kubernetes, you need to prepare a kubernetes cluster, pgsql database instance, even storage driver, and ingress for external access. 
These dependencies can be easily resolved on sealos cloud and [bytebase](https://github.com/bytebase/bytebase) can be started quickly.

LOGIN [sealos cloud](https://cloud.sealos.io)

## Create a pgsql instance

Click the postgres icon to create a pgsql cluster,[reference documents](https://www.sealos.io/docs/cloud/apps/postgres/)

## USE cloud terminal

Click the terminal icon to directly write the yaml file.

The part that needs to be modified:
1. The domain name in the startup parameters needs to be changed to the user’s own, and must be consistent with the following ingress configuration, such as "bytebase.clodu.sealos.io"
2. The database access settings in the startup parameters can be copied from the pgsql details that have been started on the sealos cloud
3. The domain name configuration in Ingress, the domain name needs to be unique

bytebase.yaml:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: bytebase
spec:
  selector:
    matchLabels:
      app: bytebase
  template:
    metadata:
      labels:
        app: bytebase
    spec:
      containers:
        - name: bytebase
          resources:
            requests:
              cpu: 0.1
              memory: 32Mi
            limits:
              cpu: 0.5
              memory: 32Mi
          image: bytebase/bytebase:1.11.0
          imagePullPolicy: Always
          args:
            [
              "--data",
              "/var/opt/bytebase",
              "--external-url",
              "https://bytebase.cloud.sealos.io",
              "--port",
              "8080",
              "--pg",
              "postgresql://test:2pk5Ra2FdqiF8idERi5Tn5yTbvqPslZaYSgw1Qh2y4MljWBkb2OTvpvK4lwmTVXM@acid-test.ns-8b66134e-5294-480f-b6c4-00243fc2488e.svc.cluster.local:5432/sealos",
            ]
          ports:
            - containerPort: 8080
          volumeMounts:
            - name: data
              mountPath: /var/opt/bytebase
          livenessProbe:
            httpGet:
              path: /healthz
              port: 8080
            initialDelaySeconds: 300
            periodSeconds: 300
            timeoutSeconds: 60
      volumes:
        - name: data
          emptyDir: {}
---
apiVersion: v1
kind: Service
metadata:
  name: bytebase-entrypoint
spec:
  type: ClusterIP
  selector:
    app: bytebase
  ports:
    - protocol: TCP
      port: 8080
      targetPort: 8080
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  annotations:
    kubernetes.io/ingress.class: nginx
    nginx.ingress.kubernetes.io/rewrite-target: /
    nginx.ingress.kubernetes.io/backend-protocol: "HTTP"
  name: bytebase
  labels:
    k8s-app: bytebase
spec:
  rules:
    - host: bytebase.cloud.sealos.io
      http:
        paths:
          - pathType: Prefix
            path: /
            backend:
              service:
                name: bytebase-entrypoint
                port:
                  number: 8080
  tls:
    - hosts:
        - bytebase.cloud.sealos.io
      secretName: wildcard-cloud-sealos-io-cert
```

```shell
root@tx3ghqs7m:~# kubectl apply -f bytebase.yaml 
deployment.apps/bytebase configured
service/bytebase-entrypoint configured
ingress.networking.k8s.io/hello-world configured

root@tx3ghqs7m:~# kubectl get pod
NAME                                                             READY   STATUS    RESTARTS   AGE
bytebase-85db7644bc-pt9cl                                        1/1     Running   0          5s
```

Then you can access bytebase through the set public network secondary domain name, such as https://bytebase.cloud.sealos.io