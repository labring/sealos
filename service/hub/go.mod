module github.com/labring/sealos/service/hub

go 1.20

require (
	github.com/cesanta/glog v0.0.0-20150527111657-22eb27a0ae19
	github.com/docker/distribution v2.8.1+incompatible
	github.com/docker/libtrust v0.0.0-20160708172513-aabc10ec26b7
	github.com/labring/sealos v0.0.0
	github.com/labring/sealos/controllers/imagehub v0.0.0
	gopkg.in/yaml.v2 v2.4.0
	k8s.io/apimachinery v0.25.6
	k8s.io/client-go v0.25.6
	sigs.k8s.io/controller-runtime v0.13.0
)

require (
	github.com/beorn7/perks v1.0.1 // indirect
	github.com/cespare/xxhash/v2 v2.2.0 // indirect
	github.com/davecgh/go-spew v1.1.1 // indirect
	github.com/emicklei/go-restful/v3 v3.9.0 // indirect
	github.com/evanphx/json-patch/v5 v5.6.0 // indirect
	github.com/fsnotify/fsnotify v1.6.0 // indirect
	github.com/go-logr/logr v1.2.3 // indirect
	github.com/go-openapi/jsonpointer v0.19.5 // indirect
	github.com/go-openapi/jsonreference v0.20.0 // indirect
	github.com/go-openapi/swag v0.22.0 // indirect
	github.com/gogo/protobuf v1.3.2 // indirect
	github.com/golang/groupcache v0.0.0-20210331224755-41bb18bfe9da // indirect
	github.com/golang/protobuf v1.5.2 // indirect
	github.com/google/gnostic v0.6.9 // indirect
	github.com/google/go-cmp v0.5.9 // indirect
	github.com/google/gofuzz v1.2.0 // indirect
	github.com/google/uuid v1.3.0 // indirect
	github.com/gorilla/mux v1.8.0 // indirect
	github.com/imdario/mergo v0.3.13 // indirect
	github.com/josharian/intern v1.0.0 // indirect
	github.com/json-iterator/go v1.1.12 // indirect
	github.com/mailru/easyjson v0.7.7 // indirect
	github.com/matttproud/golang_protobuf_extensions v1.0.4 // indirect
	github.com/modern-go/concurrent v0.0.0-20180306012644-bacd9c7ef1dd // indirect
	github.com/modern-go/reflect2 v1.0.2 // indirect
	github.com/munnerz/goautoneg v0.0.0-20191010083416-a7dc8b61c822 // indirect
	github.com/pkg/errors v0.9.1 // indirect
	github.com/prometheus/client_golang v1.14.0 // indirect
	github.com/prometheus/client_model v0.3.0 // indirect
	github.com/prometheus/common v0.37.0 // indirect
	github.com/prometheus/procfs v0.8.0 // indirect
	github.com/sirupsen/logrus v1.9.0 // indirect
	github.com/spf13/pflag v1.0.5 // indirect
	go.uber.org/atomic v1.10.0 // indirect
	go.uber.org/multierr v1.8.0 // indirect
	go.uber.org/zap v1.24.0 // indirect
	golang.org/x/net v0.3.1-0.20221206200815-1e63c2f08a10 // indirect
	golang.org/x/oauth2 v0.0.0-20221014153046-6fdb5e3db783 // indirect
	golang.org/x/sys v0.3.0 // indirect
	golang.org/x/term v0.3.0 // indirect
	golang.org/x/text v0.5.0 // indirect
	golang.org/x/time v0.0.0-20220722155302-e5dcc9cfc0b9 // indirect
	gomodules.xyz/jsonpatch/v2 v2.2.0 // indirect
	google.golang.org/appengine v1.6.7 // indirect
	google.golang.org/protobuf v1.28.1 // indirect
	gopkg.in/inf.v0 v0.9.1 // indirect
	gopkg.in/natefinch/lumberjack.v2 v2.0.0 // indirect
	gopkg.in/yaml.v3 v3.0.1 // indirect
	k8s.io/api v0.25.6 // indirect
	k8s.io/apiextensions-apiserver v0.25.6 // indirect
	k8s.io/cluster-bootstrap v0.25.6 // indirect
	k8s.io/component-base v0.25.6 // indirect
	k8s.io/klog/v2 v2.70.1 // indirect
	k8s.io/kube-openapi v0.0.0-20220803164354-a70c9af30aea // indirect
	k8s.io/kubernetes v1.25.6 // indirect
	k8s.io/utils v0.0.0-20220728103510-ee6ede2d64ed // indirect
	sigs.k8s.io/json v0.0.0-20220713155537-f223a00ba0e2 // indirect
	sigs.k8s.io/structured-merge-diff/v4 v4.2.3 // indirect
	sigs.k8s.io/yaml v1.3.0 // indirect
)

replace (
	k8s.io/api => k8s.io/api v0.25.6
	k8s.io/apiextensions-apiserver => k8s.io/apiextensions-apiserver v0.25.6
	k8s.io/apimachinery => k8s.io/apimachinery v0.25.6
	k8s.io/apiserver => k8s.io/apiserver v0.25.6
	k8s.io/cli-runtime => k8s.io/cli-runtime v0.25.6
	k8s.io/client-go => k8s.io/client-go v0.25.6
	k8s.io/cloud-provider => k8s.io/cloud-provider v0.25.6
	k8s.io/cluster-bootstrap => k8s.io/cluster-bootstrap v0.25.6
	k8s.io/code-generator => k8s.io/code-generator v0.25.6
	k8s.io/component-base => k8s.io/component-base v0.25.6
	k8s.io/component-helpers => k8s.io/component-helpers v0.25.6
	k8s.io/controller-manager => k8s.io/controller-manager v0.25.6
	k8s.io/cri-api => k8s.io/cri-api v0.25.6
	k8s.io/csi-translation-lib => k8s.io/csi-translation-lib v0.25.6
	k8s.io/kube-aggregator => k8s.io/kube-aggregator v0.25.6
	k8s.io/kube-controller-manager => k8s.io/kube-controller-manager v0.25.6
	k8s.io/kube-proxy => k8s.io/kube-proxy v0.25.6
	k8s.io/kube-scheduler => k8s.io/kube-scheduler v0.25.6
	k8s.io/kubectl => k8s.io/kubectl v0.25.6
	k8s.io/kubelet => k8s.io/kubelet v0.25.6
	k8s.io/legacy-cloud-providers => k8s.io/legacy-cloud-providers v0.25.6
	k8s.io/metrics => k8s.io/metrics v0.25.6
	k8s.io/mount-utils => k8s.io/mount-utils v0.25.6
	k8s.io/pod-security-admission => k8s.io/pod-security-admission v0.25.6
	k8s.io/sample-apiserver => k8s.io/sample-apiserver v0.25.6
)

replace (
	github.com/labring/image-cri-shim => ../../staging/src/github.com/labring/image-cri-shim
	github.com/labring/lvscare => ../../staging/src/github.com/labring/lvscare
	github.com/labring/sealos => ../../
	github.com/labring/sealos/controllers/imagehub => ../../controllers/imagehub
)
