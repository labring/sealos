module github.com/labring/sealos

go 1.15

require (
	github.com/aliyun/alibaba-cloud-sdk-go v1.61.985
	github.com/containers/buildah v1.26.1
	github.com/containers/common v0.48.0
	github.com/containers/image/v5 v5.21.1
	github.com/containers/ocicrypt v1.1.4-0.20220428134531-566b808bdf6f
	github.com/containers/storage v1.40.2
	github.com/davecgh/go-spew v1.1.1
	github.com/distribution/distribution/v3 v3.0.0-20211125133600-cc4627fc6e5f
	github.com/docker/cli v20.10.12+incompatible
	github.com/docker/docker v20.10.14+incompatible
	github.com/docker/go-connections v0.4.1-0.20210727194412-58542c764a11 // indirect
	github.com/docker/go-units v0.4.0
	github.com/docker/libtrust v0.0.0-20160708172513-aabc10ec26b7 // indirect
	github.com/emirpasic/gods v1.12.0
	github.com/google/go-cmp v0.5.8 // indirect
	github.com/hashicorp/go-multierror v1.1.1
	github.com/huaweicloud/huaweicloud-sdk-go-v3 v0.0.72
	github.com/imdario/mergo v0.3.12
	github.com/mitchellh/go-homedir v1.1.0
	github.com/moby/term v0.0.0-20210619224110-3f7ff695adc6 // indirect
	github.com/morikuni/aec v1.0.0 // indirect
	github.com/onsi/ginkgo v1.16.5
	github.com/onsi/gomega v1.19.0
	github.com/opencontainers/go-digest v1.0.0
	github.com/opencontainers/image-spec v1.0.3-0.20211202193544-a5463b7f9c84
	github.com/pelletier/go-toml v1.9.4
	github.com/pkg/errors v0.9.1
	github.com/pkg/sftp v1.13.0
	github.com/prometheus/client_golang v1.11.1 // indirect
	github.com/schollz/progressbar/v3 v3.8.5
	github.com/sealyun/lvscare v1.1.3-beta.2
	github.com/sirupsen/logrus v1.8.1
	github.com/spf13/cobra v1.4.0
	github.com/spf13/pflag v1.0.5
	github.com/spf13/viper v1.10.0 // indirect
	github.com/vishvananda/netlink v1.1.1-0.20210330154013-f5de75959ad5
	github.com/vishvananda/netns v0.0.0-20210104183010-2eb08e3e575f // indirect
	golang.org/x/crypto v0.0.0-20220411220226-7b82a4e95df4
	golang.org/x/net v0.0.0-20220225172249-27dd8689420f // indirect
	golang.org/x/sync v0.0.0-20210220032951-036812b2e83c
	golang.org/x/sys v0.0.0-20220429233432-b5fbb4746d32
	golang.org/x/xerrors v0.0.0-20220411194840-2f41105eb62f // indirect
	gopkg.in/check.v1 v1.0.0-20201130134442-10cb98267c6c // indirect
	k8s.io/api v0.22.5
	k8s.io/apimachinery v0.22.5
	k8s.io/client-go v0.22.5
	k8s.io/cluster-bootstrap v0.21.0
	k8s.io/kube-proxy v0.21.0
	k8s.io/kubelet v0.21.0
	k8s.io/utils v0.0.0-20211116205334-6203023598ed
	sigs.k8s.io/yaml v1.2.0
)

replace github.com/vishvananda/netlink => github.com/vishvananda/netlink v1.1.0
