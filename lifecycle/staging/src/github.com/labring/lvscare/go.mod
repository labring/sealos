module github.com/labring/lvscare

go 1.23

toolchain go1.23.1

require (
	github.com/labring/sealos v0.0.0
	github.com/spf13/cobra v1.8.0
	github.com/spf13/pflag v1.0.5
	github.com/vishvananda/netlink v1.2.1-beta.2
	k8s.io/apimachinery v0.30.3
	k8s.io/component-helpers v0.30.3
	k8s.io/klog/v2 v2.120.1
	k8s.io/kubernetes v1.30.3
	k8s.io/utils v0.0.0-20230726121419-3b25d923346b
	sigs.k8s.io/controller-runtime v0.13.0
)

replace (
	k8s.io/api => k8s.io/api v0.30.3
	k8s.io/apiextensions-apiserver => k8s.io/apiextensions-apiserver v0.30.3
	k8s.io/apimachinery => k8s.io/apimachinery v0.30.3
	k8s.io/apiserver => k8s.io/apiserver v0.30.3
	k8s.io/cli-runtime => k8s.io/cli-runtime v0.30.3
	k8s.io/client-go => k8s.io/client-go v0.30.3
	k8s.io/cloud-provider => k8s.io/cloud-provider v0.30.3
	k8s.io/cluster-bootstrap => k8s.io/cluster-bootstrap v0.30.3
	k8s.io/code-generator => k8s.io/code-generator v0.30.3
	k8s.io/component-base => k8s.io/component-base v0.30.3
	k8s.io/component-helpers => k8s.io/component-helpers v0.30.3
	k8s.io/controller-manager => k8s.io/controller-manager v0.30.3
	k8s.io/cri-api => k8s.io/cri-api v0.30.3
	k8s.io/csi-translation-lib => k8s.io/csi-translation-lib v0.30.3
	k8s.io/endpointslice => k8s.io/endpointslice v0.30.3
	k8s.io/kube-aggregator => k8s.io/kube-aggregator v0.30.3
	k8s.io/kube-controller-manager => k8s.io/kube-controller-manager v0.30.3
	k8s.io/kube-proxy => k8s.io/kube-proxy v0.30.3
	k8s.io/kube-scheduler => k8s.io/kube-scheduler v0.30.3
	k8s.io/kubectl => k8s.io/kubectl v0.30.3
	k8s.io/kubelet => k8s.io/kubelet v0.30.3
	k8s.io/kubernetes => k8s.io/kubernetes v1.30.3
	k8s.io/legacy-cloud-providers => k8s.io/legacy-cloud-providers v0.30.3
	k8s.io/metrics => k8s.io/metrics v0.30.3
	k8s.io/mount-utils => k8s.io/mount-utils v0.30.3
	k8s.io/pod-security-admission => k8s.io/pod-security-admission v0.30.3
	k8s.io/sample-apiserver => k8s.io/sample-apiserver v0.30.3
)

replace github.com/vishvananda/netlink => github.com/vishvananda/netlink v1.1.0

require (
	github.com/BurntSushi/toml v1.3.2 // indirect
	github.com/Masterminds/goutils v1.1.1 // indirect
	github.com/Masterminds/semver/v3 v3.2.1 // indirect
	github.com/Masterminds/sprig/v3 v3.2.3 // indirect
	github.com/beorn7/perks v1.0.1 // indirect
	github.com/blang/semver/v4 v4.0.0 // indirect
	github.com/cespare/xxhash/v2 v2.2.0 // indirect
	github.com/containers/storage v1.50.2 // indirect
	github.com/davecgh/go-spew v1.1.1 // indirect
	github.com/docker/go-units v0.5.0 // indirect
	github.com/emicklei/go-restful/v3 v3.11.0 // indirect
	github.com/emirpasic/gods v1.18.1 // indirect
	github.com/go-logr/logr v1.4.1 // indirect
	github.com/go-openapi/jsonpointer v0.19.6 // indirect
	github.com/go-openapi/jsonreference v0.20.2 // indirect
	github.com/go-openapi/swag v0.22.3 // indirect
	github.com/gogo/protobuf v1.3.2 // indirect
	github.com/golang/groupcache v0.0.0-20210331224755-41bb18bfe9da // indirect
	github.com/golang/protobuf v1.5.4 // indirect
	github.com/google/gnostic-models v0.6.8 // indirect
	github.com/google/go-cmp v0.6.0 // indirect
	github.com/google/gofuzz v1.2.0 // indirect
	github.com/google/uuid v1.3.0 // indirect
	github.com/huandu/xstrings v1.4.0 // indirect
	github.com/imdario/mergo v0.3.16 // indirect
	github.com/inconshreveable/mousetrap v1.1.0 // indirect
	github.com/josharian/intern v1.0.0 // indirect
	github.com/json-iterator/go v1.1.12 // indirect
	github.com/lithammer/dedent v1.1.0 // indirect
	github.com/mailru/easyjson v0.7.7 // indirect
	github.com/matttproud/golang_protobuf_extensions v1.0.4 // indirect
	github.com/mitchellh/copystructure v1.2.0 // indirect
	github.com/mitchellh/reflectwalk v1.0.2 // indirect
	github.com/moby/ipvs v1.1.0 // indirect
	github.com/moby/sys/mountinfo v0.6.2 // indirect
	github.com/modern-go/concurrent v0.0.0-20180306012644-bacd9c7ef1dd // indirect
	github.com/modern-go/reflect2 v1.0.2 // indirect
	github.com/munnerz/goautoneg v0.0.0-20191010083416-a7dc8b61c822 // indirect
	github.com/opencontainers/runc v1.1.12 // indirect
	github.com/opencontainers/runtime-spec v1.1.0 // indirect
	github.com/prometheus/client_golang v1.16.0 // indirect
	github.com/prometheus/client_model v0.4.0 // indirect
	github.com/prometheus/common v0.44.0 // indirect
	github.com/prometheus/procfs v0.10.1 // indirect
	github.com/shopspring/decimal v1.3.1 // indirect
	github.com/sirupsen/logrus v1.9.3 // indirect
	github.com/spf13/cast v1.5.1 // indirect
	github.com/syndtr/gocapability v0.0.0-20200815063812-42c35b437635 // indirect
	github.com/vishvananda/netns v0.0.4 // indirect
	go.uber.org/multierr v1.11.0 // indirect
	go.uber.org/zap v1.26.0 // indirect
	golang.org/x/crypto v0.25.0 // indirect
	golang.org/x/exp v0.0.0-20230522175609-2e198f4a06a1 // indirect
	golang.org/x/net v0.25.0 // indirect
	golang.org/x/oauth2 v0.10.0 // indirect
	golang.org/x/sys v0.22.0 // indirect
	golang.org/x/term v0.22.0 // indirect
	golang.org/x/text v0.16.0 // indirect
	golang.org/x/time v0.3.0 // indirect
	google.golang.org/appengine v1.6.7 // indirect
	google.golang.org/protobuf v1.33.0 // indirect
	gopkg.in/inf.v0 v0.9.1 // indirect
	gopkg.in/natefinch/lumberjack.v2 v2.2.1 // indirect
	gopkg.in/yaml.v2 v2.4.0 // indirect
	gopkg.in/yaml.v3 v3.0.1 // indirect
	k8s.io/api v0.30.3 // indirect
	k8s.io/apiextensions-apiserver v0.30.3 // indirect
	k8s.io/apiserver v0.30.3 // indirect
	k8s.io/client-go v0.30.3 // indirect
	k8s.io/component-base v0.30.3 // indirect
	k8s.io/kube-openapi v0.0.0-20240228011516-70dd3763d340 // indirect
	sigs.k8s.io/json v0.0.0-20221116044647-bc3834ca7abd // indirect
	sigs.k8s.io/structured-merge-diff/v4 v4.4.1 // indirect
	sigs.k8s.io/yaml v1.4.0 // indirect
)

replace github.com/labring/sealos => ../../../../../
