env

kubectl config set-credentials ${USER_NAME} --token=${USER_TOKEN}
kubectl config set-cluster kubernetes --server=${APISERVER} --insecure-skip-tls-verify=true
kubectl config set-context kubernetes \
--cluster=kubernetes \
--user=${USER_NAME} \
--namespace=${NAMESPACE}
kubectl config use-context kubernetes

cat ~/.kube/config

# ttyd -p 8080 bash
ttyd -p 8080 zsh