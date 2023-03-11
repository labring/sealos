## How to using webhook generate to webhook_config
set remote http webhook url
```go

gen := NewGenerate(&Config{
    Webhook:    true,
    WebhookURL: "http://192.168.64.1:8080/auth",
})
config, err := gen.KubeConfig(cfg, k8sClient)
kubeData, err := clientcmd.Write(*config)
err = os.WriteFile("output-webhook", kubeData, 0600)
```

Note that the address of this webhookURL should be specific to the path `/path`

## Add webhook config to apiserver node
update apiserver config `/etc/kubernetes/manifests/kube-apiserver.yaml`
1. authorization-mode add Webhook mode
2. authorization-webhook-config-file set webhook config
3. add volume for apiserer config mount webhook config
```yaml
apiVersion: v1
kind: Pod
metadata:
  annotations:
    kubeadm.kubernetes.io/kube-apiserver.advertise-address.endpoint: 192.168.64.31:6443
  creationTimestamp: null
  labels:
    component: kube-apiserver
    tier: control-plane
  name: kube-apiserver
  namespace: kube-system
spec:
  containers:
  - command:
    - kube-apiserver
    - --advertise-address=192.168.64.31
    - --allow-privileged=true
    - --audit-log-format=json
    - --audit-log-maxage=7
    - --audit-log-maxbackup=10
    - --audit-log-maxsize=200
    - --audit-log-path=/var/log/kubernetes/audit.log
    - --audit-policy-file=/etc/kubernetes/audit-policy.yml
    - --authorization-mode=Node,RBAC,Webhook
    - --authorization-webhook-config-file=/root/.kube_webhook/config
    - --client-ca-file=/etc/kubernetes/pki/ca.crt
    - --enable-admission-plugins=NodeRestriction
    - --enable-aggregator-routing=true
    - --enable-bootstrap-token-auth=true
    - --etcd-cafile=/etc/kubernetes/pki/etcd/ca.crt
    - --etcd-certfile=/etc/kubernetes/pki/apiserver-etcd-client.crt
    - --etcd-keyfile=/etc/kubernetes/pki/apiserver-etcd-client.key
    - --etcd-servers=https://192.168.64.31:2379
    - --feature-gates=TTLAfterFinished=true,EphemeralContainers=true
    - --kubelet-client-certificate=/etc/kubernetes/pki/apiserver-kubelet-client.crt
    - --kubelet-client-key=/etc/kubernetes/pki/apiserver-kubelet-client.key
    - --kubelet-preferred-address-types=InternalIP,ExternalIP,Hostname
    - --proxy-client-cert-file=/etc/kubernetes/pki/front-proxy-client.crt
    - --proxy-client-key-file=/etc/kubernetes/pki/front-proxy-client.key
    - --requestheader-allowed-names=front-proxy-client
    - --requestheader-client-ca-file=/etc/kubernetes/pki/front-proxy-ca.crt
    - --requestheader-extra-headers-prefix=X-Remote-Extra-
    - --requestheader-group-headers=X-Remote-Group
    - --requestheader-username-headers=X-Remote-User
    - --secure-port=6443
    - --service-account-issuer=https://kubernetes.default.svc.cluster.local
    - --service-account-key-file=/etc/kubernetes/pki/sa.pub
    - --service-account-signing-key-file=/etc/kubernetes/pki/sa.key
    - --service-cluster-ip-range=10.96.0.0/22
    - --tls-cert-file=/etc/kubernetes/pki/apiserver.crt
    - --tls-private-key-file=/etc/kubernetes/pki/apiserver.key
    image: k8s.gcr.io/kube-apiserver:v1.23.10
    imagePullPolicy: IfNotPresent
    livenessProbe:
      failureThreshold: 8
      httpGet:
        host: 192.168.64.31
        path: /livez
        port: 6443
        scheme: HTTPS
      initialDelaySeconds: 10
      periodSeconds: 10
      timeoutSeconds: 15
    name: kube-apiserver
    readinessProbe:
      failureThreshold: 3
      httpGet:
        host: 192.168.64.31
        path: /readyz
        port: 6443
        scheme: HTTPS
      periodSeconds: 1
      timeoutSeconds: 15
    resources:
      requests:
        cpu: 250m
    startupProbe:
      failureThreshold: 24
      httpGet:
        host: 192.168.64.31
        path: /livez
        port: 6443
        scheme: HTTPS
      initialDelaySeconds: 10
      periodSeconds: 10
      timeoutSeconds: 15
    volumeMounts:
    - mountPath: /etc/kubernetes
      name: audit
    - mountPath: /var/log/kubernetes
      name: audit-log
    - mountPath: /etc/ssl/certs
      name: ca-certs
      readOnly: true
    - mountPath: /etc/ca-certificates
      name: etc-ca-certificates
      readOnly: true
    - mountPath: /etc/pki
      name: etc-pki
      readOnly: true
    - mountPath: /etc/kubernetes/pki
      name: k8s-certs
      readOnly: true
    - mountPath: /etc/localtime
      name: localtime
      readOnly: true
    - mountPath: /usr/local/share/ca-certificates
      name: usr-local-share-ca-certificates
      readOnly: true
    - mountPath: /usr/share/ca-certificates
      name: usr-share-ca-certificates
      readOnly: true
    - mountPath: /root/.kube_webhook
      name: webhook
      readOnly: true
  hostNetwork: true
  priorityClassName: system-node-critical
  securityContext:
    seccompProfile:
      type: RuntimeDefault
  volumes:
  - hostPath:
      path: /etc/kubernetes
      type: DirectoryOrCreate
    name: audit
  - hostPath:
      path: /var/log/kubernetes
      type: DirectoryOrCreate
    name: audit-log
  - hostPath:
      path: /etc/ssl/certs
      type: DirectoryOrCreate
    name: ca-certs
  - hostPath:
      path: /etc/ca-certificates
      type: DirectoryOrCreate
    name: etc-ca-certificates
  - hostPath:
      path: /etc/pki
      type: DirectoryOrCreate
    name: etc-pki
  - hostPath:
      path: /etc/kubernetes/pki
      type: DirectoryOrCreate
    name: k8s-certs
  - hostPath:
      path: /etc/localtime
      type: File
    name: localtime
  - hostPath:
      path: /usr/local/share/ca-certificates
      type: DirectoryOrCreate
    name: usr-local-share-ca-certificates
  - hostPath:
      path: /usr/share/ca-certificates
      type: DirectoryOrCreate
    name: usr-share-ca-certificates
  - hostPath:
      path: /root/.kube_webhook
      type: DirectoryOrCreate
    name: webhook
status: {}
```

## coding http webhook server
```go
func HttpServer(port uint16) error {
	r := gin.New()
	gin.SetMode(gin.ReleaseMode)
	r.Use(middlewares.GinLogger(), middlewares.GinRecovery(true))

	r.POST("/auth", Auth)
	gin.SetMode(gin.DebugMode)
	//prefix := "/Users/cuisongliu/Workspaces/go/src/github.com/cuisongliu/rbac-blacklist/pki"
	return r.Run(fmt.Sprintf("%s:%d", "0.0.0.0", port))
}

var serverLogger = ctrl.Log.WithName("serverLogger")

func Auth(ctx *gin.Context) {
	fmt.Println("auth in ...")
	var review v1.SubjectAccessReview
	err := ctx.BindJSON(&review)
	//{"kind":"SubjectAccessReview","apiVersion":"authorization.k8s.io/v1beta1","metadata":{"creationTimestamp":null},"spec":{"resourceAttributes":{"namespace":"ns-cuisongliu","verb":"list","version":"v1","resource":"pods"},"user":"system:serviceaccount:default:cuisongliu","group":["system:serviceaccounts","system:serviceaccounts:default","system:authenticated"],"uid":"01575033-6a76-4426-88d0-3da94c6c3e03"},"status":{"allowed":false}}
	//d, err := ctx.GetRawData()
	fmt.Println("inff", "msg", string(review.Spec.User))
	if err != nil {
		fmt.Println(err, "has error")
	}

	//allow := true
	//if review.Spec.ResourceAttributes.Resource == "configmaps" && review.Spec.ResourceAttributes.Name == "my-config" {
	//	allow = false
	//}
	r := &v1.SubjectAccessReview{
		TypeMeta: v12.TypeMeta{
			Kind:       "SubjectAccessReview",
			APIVersion: "authorization.k8s.io/v1beta1",
		},
		Status: v1.SubjectAccessReviewStatus{Allowed:  review.Status.Allowed, Denied: false},
	}
	ctx.JSONP(200, r)
}

```

The data obtained by the review structure is the data after the previous authentication logic (RBAC, ABAC)
