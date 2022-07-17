module github.com/labring/sealos

go 1.15

require (
	github.com/aliyun/alibaba-cloud-sdk-go v1.61.985
	github.com/casdoor/casdoor-go-sdk v0.4.1
	github.com/containers/buildah v1.26.1
	github.com/containers/common v0.48.0
	github.com/containers/image/v5 v5.21.1
	github.com/containers/ocicrypt v1.1.4-0.20220428134531-566b808bdf6f
	github.com/containers/storage v1.40.2
	github.com/davecgh/go-spew v1.1.1
	github.com/distribution/distribution/v3 v3.0.0-20211125133600-cc4627fc6e5f
	github.com/docker/cli v20.10.12+incompatible
	github.com/docker/docker v20.10.14+incompatible
	github.com/docker/go-units v0.4.0
	github.com/emicklei/go-restful v2.15.0+incompatible
	github.com/emirpasic/gods v1.18.1
	github.com/hashicorp/go-multierror v1.1.1
	github.com/huaweicloud/huaweicloud-sdk-go-v3 v0.0.72
	github.com/imdario/mergo v0.3.12
	github.com/labring/image-cri-shim v0.0.0
	github.com/labring/lvscare v0.0.0
	github.com/mitchellh/go-homedir v1.1.0
	github.com/onsi/ginkgo v1.16.5
	github.com/onsi/gomega v1.19.0
	github.com/opencontainers/go-digest v1.0.0
	github.com/opencontainers/image-spec v1.0.3-0.20211202193544-a5463b7f9c84
	github.com/opencontainers/runtime-spec v1.0.3-0.20210326190908-1c3f411f0417
	github.com/pelletier/go-toml v1.9.5
	github.com/pkg/errors v0.9.1
	github.com/pkg/sftp v1.13.0
	github.com/schollz/progressbar/v3 v3.8.6
	github.com/spf13/cobra v1.4.0
	github.com/spf13/pflag v1.0.5
	go.uber.org/zap v1.21.0
	golang.org/x/crypto v0.0.0-20220411220226-7b82a4e95df4
	golang.org/x/sync v0.0.0-20210220032951-036812b2e83c
	golang.org/x/sys v0.0.0-20220704084225-05e143d24a9e
	golang.org/x/term v0.0.0-20210927222741-03fcf44c2211
	gopkg.in/natefinch/lumberjack.v2 v2.0.0
	helm.sh/helm/v3 v3.6.0
	k8s.io/api v0.24.0
	k8s.io/apimachinery v0.24.0
	k8s.io/client-go v0.24.0
	k8s.io/cluster-bootstrap v0.23.1
	k8s.io/kube-proxy v0.23.1
	k8s.io/kubelet v0.23.1
	k8s.io/utils v0.0.0-20220210201930-3a6ce19ff2f9
	sigs.k8s.io/controller-runtime v0.12.1
	sigs.k8s.io/yaml v1.3.0
)

replace (
	github.com/labring/image-cri-shim => ./staging/src/github.com/labring/image-cri-shim
	github.com/labring/lvscare => ./staging/src/github.com/labring/lvscare
	github.com/labring/sealos => ../sealos
)

replace github.com/vishvananda/netlink => github.com/vishvananda/netlink v1.1.0
