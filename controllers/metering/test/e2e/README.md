### 1. run the controller locally (Prerequisite)

```
cd controllers/metering/
make run
```
### 2. run all the tests


```
make test
```
### Optional run a specific test for debugging
```
# run a specific test
go test ./tests/e2e/store_create_test.go
```


CI/CD
0. prepare a remote k8s cluster
   TODO: ensure a ready k8s cluster config is located in ~/.kube/config

1. build & push the controller image
# build the image
IMG=ghcr.io/database-controller:ci-test make docker-build

# push the image
IMG=ghcr.io/database-controller:ci-test make docker-push
2. deploy the crd
# deploy the controller
kubectl apply -f config/crd/bases
kubectl apply -f config/rbac
kubectl apply -f config/manager
3. run tests in local
   make test