### docker image build and deploy
```bash
make docker-build IMG=$(YourImageName)
# edit deploy/manifests/depoly.yaml and deploy
kubectl apply -f deploy/manifests/depoly.yaml
```

### cluster image build and deploy
```bash
```