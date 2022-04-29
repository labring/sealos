## build calico image in offline module

```
.
├── Kubefile
├── cni
│   ├── custom-resources.yaml
│   └── tigera-operator.yaml
├── images
│   └── shim
│       └── CalicoImageList
└── registry
    └── docker
        └── registry
```

run one image build func

```dockerfile
FROM registry.cn-hongkong.aliyuncs.com/sealyun/oci-kubernetes:1.22.8-amd64
COPY cni ./cni
COPY images ./images
COPY registry ./registry
CMD ["kubectl apply -f cni/tigera-operator.yaml","kubectl apply -f cni/custom-resources.yaml"]
```

run multi image build func

```dockerfile
FROM scratch
COPY cni ./cni
COPY images ./images
COPY registry ./registry
COPY manifests ./manifests
CMD ["kubectl apply -f cni/tigera-operator.yaml","kubectl apply -f cni/custom-resources.yaml"]
```


1. the `CalicoImageList` is offline image list file.
2. the cni dir is kubectl apply config files
3. the registry is the registry data dir 
4. exec `buildah build  -t registry.cn-hongkong.aliyuncs.com/sealyun/oci-kubernetes-calico:1.22.8-amd64 --arch amd64 --os linux -f Kubefile .` build the oci image
5. manifests dis parse yaml images to offline image list

## build calico image in online module

```
.
├── Kubefile
├── cni
│   ├── custom-resources.yaml
│   └── tigera-operator.yaml

```

run one image build func

```dockerfile
FROM registry.cn-hongkong.aliyuncs.com/sealyun/oci-kubernetes:1.22.8-amd64
COPY cni ./cni
CMD ["kubectl apply -f cni/tigera-operator.yaml","kubectl apply -f cni/custom-resources.yaml"]
```

run multi image build func

```dockerfile
FROM scratch
COPY cni ./cni
CMD ["kubectl apply -f cni/tigera-operator.yaml","kubectl apply -f cni/custom-resources.yaml"]
```

1. the cni dir is kubectl apply config files
2. exec `buildah build  -t registry.cn-hongkong.aliyuncs.com/sealyun/oci-kubernetes-calico:1.22.8-amd64 --arch amd64 --os linux -f Kubefile .` build the oci image


## build openebs image in online module

```
.
├── Kubefile
└── manifests
    └── openebs-operator.yaml

```

run one image build func

```dockerfile
FROM registry.cn-hongkong.aliyuncs.com/sealyun/oci-kubernetes-calico:1.22.8-amd64
COPY manifests ./manifests
CMD ["kubectl apply -f cni/tigera-operator.yaml","kubectl apply -f cni/custom-resources.yaml","kubectl apply -f manifests/openebs-operator.yaml"]
```

run multi image build func

```dockerfile
FROM scratch
COPY manifests ./manifests
CMD ["kubectl apply -f manifests/openebs-operator.yaml"]
```


1. the cni dir is kubectl apply config files
2. exec `buildah build  -t registry.cn-hongkong.aliyuncs.com/sealyun/oci-kubernetes-calico-openebs:1.22.8-amd64 --arch amd64 --os linux -f Kubefile .` build the oci image

tips: you need add calico cmd to openebs cmd layer,because the dockerfile override to old layer in run one image func
      

## build multi-architecture image

```shell
buildah build -t $prefix/oci-kubernetes:$version-amd64 --arch amd64 --os linux -f Kubefile  . 
buildah build -t $prefix/oci-kubernetes:$version-arm64 --arch arm64 --os linux -f Kubefile  .

buildah login --username $username --password $password $domain
buildah push $prefix/oci-kubernetes:$version-amd64
buildah push $prefix/oci-kubernetes:$version-arm64
buildah manifest create $prefix/oci-kubernetes:$version
buildah manifest add $prefix/oci-kubernetes:$version docker://$prefix/oci-kubernetes:$version-amd64
buildah manifest add $prefix/oci-kubernetes:$version docker://$prefix/oci-kubernetes:$version-arm64
buildah manifest push --all $prefix/oci-kubernetes:$version docker://$prefix/oci-kubernetes:$version
```
