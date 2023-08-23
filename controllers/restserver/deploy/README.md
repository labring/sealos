### docker image build and deploy
```bash
make docker-build IMG=$(YourImageName)
# edit deploy/manifests/depoly.yaml and deploy
kubectl apply -f deploy/manifests/depoly.yaml
```

### cluster image build and deploy
```bash
```

### Victoria Metrics

In order to prevent performance degradation or abnormal behavior caused by excessive data size in Prometheus, VictoriaMetrics is utilized for data collection.

> By default, we use kb-prometheus-server for the data collection service.