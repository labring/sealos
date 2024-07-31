# Container Runtime shim for Kubernetes

This is a shim for containerd that implements the Kubernetes CRI (Container Runtime Interface).

## Usage

The shim is a standalone binary that implements the Kubernetes CRI. It is designed to be run as a separate process from
containerd. The shim listens on a UNIX socket for CRI requests from the kubelet. The shim forwards these requests to
containerd using the containerd gRPC API.

## Building

```bash
make build
```

## Running

### Run the shim

```bash
mkdir -p /var/run/sealos && touch /var/run/sealos/cri-shim.sock
sudo ./bin/cri-shim --cri-socket=unix:///var/run/containerd/containerd.sock --shim-socket=/var/run/sealos/cri-shim.sock
```

### Update the kubelet configuration

Change the kubelet configuration to use the shim, for example:

```bash
vim /etc/systemd/system/kubelet.service.d/10-kubeadm.conf

# add flag --container-runtime-endpoint to the kubelet

e.g:
ExecStart=/usr/bin/kubelet --container-runtime-endpoint=unix:///var/run/sealos/cri-shim.sock
```

### Restart the kubelet

```bash
sudo systemctl daemon-reload
sudo systemctl restart kubelet
```

## Testing

Create a pod using yaml file: `test/busybox.yaml`, then after pod created, exec into the pod and run command create a
file in the pod directory.

```bash
# you may need to change the image registry addr, user, password and related env to the one you have
kubectl apply -f test/busybox.yaml
kubectl exec -it commit -n commit-test -c busybox-1 -- sh -c 'echo "hello world" > /tmp/test && cat /tmp/test'
```

Delete the pod:

```bash
kubectl delete pod commit -n commit-test
```

See the logs of the shim and check images in k8s.io namespace:

```bash
crictl images
```

After the pod is deleted, the commit image should be generated.

Edit the pod yaml file: `test/busybox.yaml`, change the image to `docker.io/labring/busybox-commit:dev`, then apply the
yaml file again.

```bash
kubectl apply -f test/busybox.yaml
```

Exec into the pod and check the file created before:

```bash
kubectl exec -it commit -n commit-test -c busybox-1 -- cat /tmp/test
```