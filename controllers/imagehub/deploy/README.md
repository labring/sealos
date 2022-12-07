### Build Image
```bash
make docker-build IMG=$(YourImageName)
```

### Deploy
```bash
make pre-deploy IMG=$(YourImageName) && kubectl apply -f deploy/manifests/deploy.yaml && kubectl apply -f deploy/rbac/rbac.yaml
```
or just
```bash
make deploy IMG=$(YourImageName) &&  kubectl apply -f deploy/rbac/rbac.yaml
```