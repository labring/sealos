module github.com/labring/sealos

go 1.26.0

require (
	github.com/BurntSushi/toml v1.3.2
	github.com/Masterminds/semver/v3 v3.4.0
	github.com/Masterminds/sprig/v3 v3.2.3
	github.com/containerd/containerd v1.7.12
	github.com/containers/buildah v1.30.0
	github.com/containers/common v0.53.0
	github.com/containers/image/v5 v5.25.1-0.20230605120906-abe51339f34d
	github.com/containers/ocicrypt v1.1.7
	github.com/containers/storage v1.50.2
	github.com/davecgh/go-spew v1.1.2-0.20180830191138-d8f796af33cc
	github.com/distribution/distribution/v3 v3.0.0-20221208165359-362910506bc2
	github.com/distribution/reference v0.6.0
	github.com/docker/cli v25.0.1+incompatible
	github.com/docker/docker v25.0.6+incompatible
	github.com/docker/go-units v0.5.0
	github.com/emicklei/go-restful/v3 v3.13.0
	github.com/emirpasic/gods v1.18.1
	github.com/google/go-containerregistry v0.15.2
	github.com/hashicorp/go-multierror v1.1.1
	github.com/imdario/mergo v0.3.16
	github.com/labring/image-cri-shim v0.0.0
	github.com/labring/lvscare v0.0.0
	github.com/manifoldco/promptui v0.9.0
	github.com/modood/table v0.0.0-20220527013332-8d47e76dad33
	github.com/opencontainers/go-digest v1.0.1-0.20220411205349-bde1400a84be
	github.com/opencontainers/image-spec v1.1.1
	github.com/pelletier/go-toml v1.9.5
	github.com/pkg/errors v0.9.1
	github.com/pkg/sftp v1.13.5
	github.com/schollz/progressbar/v3 v3.8.6
	github.com/sirupsen/logrus v1.9.3
	github.com/spf13/cobra v1.10.2
	github.com/spf13/pflag v1.0.9
	github.com/stretchr/testify v1.11.1
	github.com/syndtr/gocapability v0.0.0-20200815063812-42c35b437635
	github.com/vishvananda/netlink v1.3.1
	go.uber.org/zap v1.27.1
	golang.org/x/crypto v0.53.0
	golang.org/x/exp v0.0.0-20251219203646-944ab1f22d93
	golang.org/x/sync v0.21.0
	golang.org/x/sys v0.46.0
	golang.org/x/term v0.44.0
	google.golang.org/grpc v1.79.3
	gopkg.in/natefinch/lumberjack.v2 v2.2.1
	gopkg.in/yaml.v2 v2.4.0
	helm.sh/helm/v3 v3.15.4
	k8s.io/api v0.36.6
	k8s.io/apimachinery v0.36.6
	k8s.io/client-go v0.36.6
	k8s.io/kube-proxy v0.36.6
	k8s.io/kubectl v0.36.6
	k8s.io/kubelet v0.36.6
	k8s.io/kubernetes v1.36.6
	k8s.io/utils v0.0.0-20260210185600-b8788abfbbc2
	sigs.k8s.io/controller-runtime v0.24.1
	sigs.k8s.io/kustomize/kyaml v0.21.1
	sigs.k8s.io/yaml v1.6.0
)

require (
	github.com/NYTimes/gziphandler v1.1.1 // indirect
	github.com/coreos/go-semver v0.3.1 // indirect
	github.com/coreos/go-systemd/v22 v22.7.0 // indirect
	github.com/google/cel-go v0.26.0 // indirect
	github.com/grpc-ecosystem/grpc-gateway/v2 v2.27.7 // indirect
	github.com/stoewer/go-strcase v1.3.0 // indirect
	go.etcd.io/etcd/api/v3 v3.6.8
	go.etcd.io/etcd/client/pkg/v3 v3.6.8
	go.etcd.io/etcd/client/v3 v3.6.8
	google.golang.org/genproto/googleapis/api v0.0.0-20260128011058-8636f8732409 // indirect
	k8s.io/cloud-provider v0.30.3 // indirect
	k8s.io/controller-manager v0.36.6 // indirect
	k8s.io/cri-api v0.36.6
	k8s.io/kms v0.36.6 // indirect
	sigs.k8s.io/apiserver-network-proxy/konnectivity-client v0.34.0 // indirect
)

require (
	cel.dev/expr v0.25.1 // indirect
	github.com/AdaLogics/go-fuzz-headers v0.0.0-20230811130428-ced1acdcaa24 // indirect
	github.com/Azure/go-ansiterm v0.0.0-20230124172434-306776ec8161 // indirect
	github.com/MakeNowJust/heredoc v1.0.0 // indirect
	github.com/Masterminds/goutils v1.1.1 // indirect
	github.com/Microsoft/go-winio v0.6.2 // indirect
	github.com/Microsoft/hcsshim v0.12.0-rc.0 // indirect
	github.com/VividCortex/ewma v1.2.0 // indirect
	github.com/acarl005/stripansi v0.0.0-20180116102854-5a71ef0e047d // indirect
	github.com/antlr4-go/antlr/v4 v4.13.0 // indirect
	github.com/asaskevich/govalidator v0.0.0-20230301143203-a9d515a09cc2 // indirect
	github.com/beorn7/perks v1.0.1 // indirect
	github.com/blang/semver/v4 v4.0.0 // indirect
	github.com/cenkalti/backoff/v4 v4.3.0 // indirect
	github.com/cenkalti/backoff/v5 v5.0.3 // indirect
	github.com/cespare/xxhash/v2 v2.3.0 // indirect
	github.com/chzyer/readline v1.5.1 // indirect
	github.com/container-orchestrated-devices/container-device-interface v0.6.1 // indirect
	github.com/containerd/cgroups/v3 v3.0.2 // indirect
	github.com/containerd/log v0.1.0 // indirect
	github.com/containerd/stargz-snapshotter/estargz v0.14.3 // indirect
	github.com/containernetworking/cni v1.1.2 // indirect
	github.com/containernetworking/plugins v1.3.0 // indirect
	github.com/containers/libtrust v0.0.0-20230121012942-c1716e8a8d01 // indirect
	github.com/cpuguy83/go-md2man/v2 v2.0.7 // indirect
	github.com/cyberphone/json-canonicalization v0.0.0-20230514072755-504adb8a8af1 // indirect
	github.com/cyphar/filepath-securejoin v0.6.1 // indirect
	github.com/disiqueira/gotree/v3 v3.0.2 // indirect
	github.com/docker/distribution v2.8.3+incompatible // indirect
	github.com/docker/docker-credential-helpers v0.7.0 // indirect
	github.com/docker/go-connections v0.6.0 // indirect
	github.com/docker/go-events v0.0.0-20190806004212-e31b211e4f1c // indirect
	github.com/docker/go-metrics v0.0.1 // indirect
	github.com/docker/libtrust v0.0.0-20160708172513-aabc10ec26b7 // indirect
	github.com/dustin/go-humanize v1.0.1 // indirect
	github.com/evanphx/json-patch/v5 v5.9.11 // indirect
	github.com/felixge/httpsnoop v1.0.4 // indirect
	github.com/fsnotify/fsnotify v1.9.0 // indirect
	github.com/fsouza/go-dockerclient v1.9.7 // indirect
	github.com/fxamacker/cbor/v2 v2.9.0 // indirect
	github.com/ghodss/yaml v1.0.0 // indirect
	github.com/go-errors/errors v1.4.2 // indirect
	github.com/go-logr/logr v1.4.3 // indirect
	github.com/go-logr/stdr v1.2.2 // indirect
	github.com/go-openapi/analysis v0.21.4 // indirect
	github.com/go-openapi/errors v0.20.3 // indirect
	github.com/go-openapi/jsonpointer v0.21.0 // indirect
	github.com/go-openapi/jsonreference v0.20.2 // indirect
	github.com/go-openapi/loads v0.21.2 // indirect
	github.com/go-openapi/runtime v0.26.0 // indirect
	github.com/go-openapi/spec v0.20.9 // indirect
	github.com/go-openapi/strfmt v0.21.7 // indirect
	github.com/go-openapi/swag v0.23.0 // indirect
	github.com/go-openapi/validate v0.22.1 // indirect
	github.com/gobwas/glob v0.2.3 // indirect
	github.com/godbus/dbus/v5 v5.2.2 // indirect
	github.com/gogo/protobuf v1.3.2 // indirect
	github.com/golang/groupcache v0.0.0-20210331224755-41bb18bfe9da // indirect
	github.com/golang/protobuf v1.5.4 // indirect
	github.com/gomodule/redigo v1.8.2 // indirect
	github.com/google/btree v1.1.3 // indirect
	github.com/google/cadvisor v0.56.2 // indirect
	github.com/google/gnostic-models v0.7.0 // indirect
	github.com/google/go-intervals v0.0.2 // indirect
	github.com/google/uuid v1.6.0 // indirect
	github.com/gorilla/handlers v1.5.1 // indirect
	github.com/gorilla/mux v1.8.0 // indirect
	github.com/grpc-ecosystem/go-grpc-middleware/providers/prometheus v1.1.0 // indirect
	github.com/grpc-ecosystem/go-grpc-middleware/v2 v2.3.3 // indirect
	github.com/hashicorp/errwrap v1.1.0 // indirect
	github.com/hashicorp/golang-lru v0.5.4 // indirect
	github.com/huandu/xstrings v1.4.0 // indirect
	github.com/inconshreveable/mousetrap v1.1.0 // indirect
	github.com/jinzhu/copier v0.3.5 // indirect
	github.com/josharian/intern v1.0.0 // indirect
	github.com/json-iterator/go v1.1.12 // indirect
	github.com/klauspost/compress v1.18.0 // indirect
	github.com/klauspost/pgzip v1.2.6 // indirect
	github.com/kr/fs v0.1.0 // indirect
	github.com/kylelemons/godebug v1.1.0 // indirect
	github.com/letsencrypt/boulder v0.0.0-20230213213521-fdfea0d469b6 // indirect
	github.com/liggitt/tabwriter v0.0.0-20181228230101-89fcab3d43de // indirect
	github.com/lithammer/dedent v1.1.0 // indirect
	github.com/mailru/easyjson v0.7.7 // indirect
	github.com/mattn/go-runewidth v0.0.16 // indirect
	github.com/mattn/go-shellwords v1.0.12 // indirect
	github.com/miekg/pkcs11 v1.1.1 // indirect
	github.com/mistifyio/go-zfs/v3 v3.0.1 // indirect
	github.com/mitchellh/colorstring v0.0.0-20190213212951-d06e56a500db // indirect
	github.com/mitchellh/copystructure v1.2.0 // indirect
	github.com/mitchellh/go-homedir v1.1.0 // indirect
	github.com/mitchellh/go-wordwrap v1.0.1 // indirect
	github.com/mitchellh/mapstructure v1.5.0 // indirect
	github.com/mitchellh/reflectwalk v1.0.2 // indirect
	github.com/moby/ipvs v1.1.0 // indirect
	github.com/moby/locker v1.0.1 // indirect
	github.com/moby/patternmatcher v0.5.0 // indirect
	github.com/moby/sys/capability v0.4.0 // indirect
	github.com/moby/sys/mountinfo v0.7.2 // indirect
	github.com/moby/sys/sequential v0.5.0 // indirect
	github.com/moby/sys/user v0.4.0 // indirect
	github.com/moby/term v0.5.0 // indirect
	github.com/modern-go/concurrent v0.0.0-20180306012644-bacd9c7ef1dd // indirect
	github.com/modern-go/reflect2 v1.0.3-0.20250322232337-35a7c28c31ee // indirect
	github.com/monochromegane/go-gitignore v0.0.0-20200626010858-205db1a8cc00 // indirect
	github.com/morikuni/aec v1.0.0 // indirect
	github.com/munnerz/goautoneg v0.0.0-20191010083416-a7dc8b61c822 // indirect
	github.com/oklog/ulid v1.3.1 // indirect
	github.com/opencontainers/runc v1.4.0 // indirect
	github.com/opencontainers/runtime-spec v1.3.0 // indirect
	github.com/opencontainers/runtime-tools v0.9.1-0.20261017090856-bd3b0bd00f44 // indirect
	github.com/opencontainers/selinux v1.13.1 // indirect
	github.com/openshift/imagebuilder v1.2.4-0.20230309135844-a3c3f8358ca3 // indirect
	github.com/ostreedev/ostree-go v0.0.0-20210805093236-719684c64e4f // indirect
	github.com/peterbourgon/diskv v2.0.1+incompatible // indirect
	github.com/pmezard/go-difflib v1.0.1-0.20181226105442-5d4384ee4fb2 // indirect
	github.com/proglottis/gpgme v0.1.3 // indirect
	github.com/prometheus/client_golang v1.23.2 // indirect
	github.com/prometheus/client_model v0.6.2 // indirect
	github.com/prometheus/common v0.67.5 // indirect
	github.com/prometheus/procfs v0.19.2 // indirect
	github.com/rivo/uniseg v0.4.7 // indirect
	github.com/robfig/cron/v3 v3.0.1 // indirect
	github.com/russross/blackfriday/v2 v2.1.0 // indirect
	github.com/seccomp/libseccomp-golang v0.11.1 // indirect
	github.com/shopspring/decimal v1.3.1 // indirect
	github.com/sigstore/fulcio v1.3.1 // indirect
	github.com/sigstore/rekor v1.2.2-0.20230601122533-4c81ff246d12 // indirect
	github.com/sigstore/sigstore v1.6.5 // indirect
	github.com/smartystreets/goconvey v1.8.0 // indirect
	github.com/spf13/cast v1.5.1 // indirect
	github.com/stefanberger/go-pkcs11uri v0.0.0-20201008174630-78d3cae3a980 // indirect
	github.com/sylabs/sif/v2 v2.11.4 // indirect
	github.com/tchap/go-patricia/v2 v2.3.1 // indirect
	github.com/theupdateframework/go-tuf v0.5.2 // indirect
	github.com/titanous/rocacheck v0.0.0-20171023193734-afe73141d399 // indirect
	github.com/ulikunitz/xz v0.5.11 // indirect
	github.com/vbatts/tar-split v0.11.5 // indirect
	github.com/vbauerster/mpb/v8 v8.4.0 // indirect
	github.com/vishvananda/netns v0.0.5 // indirect
	github.com/x448/float16 v0.8.4 // indirect
	github.com/xeipuuv/gojsonpointer v0.0.0-20190905194746-02993c407bfb // indirect
	github.com/xeipuuv/gojsonreference v0.0.0-20180127040603-bd5ef7bd5415 // indirect
	github.com/xeipuuv/gojsonschema v1.2.0 // indirect
	github.com/xlab/treeprint v1.2.0 // indirect
	go.etcd.io/bbolt v1.4.3 // indirect
	go.mongodb.org/mongo-driver v1.12.1 // indirect
	go.mozilla.org/pkcs7 v0.0.0-20210826202110-33d05740a352 // indirect
	go.opencensus.io v0.24.0 // indirect
	go.opentelemetry.io/auto/sdk v1.2.1 // indirect
	go.opentelemetry.io/contrib/instrumentation/google.golang.org/grpc/otelgrpc v0.65.0 // indirect
	go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp v0.65.0 // indirect
	go.opentelemetry.io/otel v1.41.0 // indirect
	go.opentelemetry.io/otel/exporters/otlp/otlptrace v1.40.0 // indirect
	go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc v1.40.0 // indirect
	go.opentelemetry.io/otel/metric v1.41.0 // indirect
	go.opentelemetry.io/otel/sdk v1.40.0 // indirect
	go.opentelemetry.io/otel/trace v1.41.0 // indirect
	go.opentelemetry.io/proto/otlp v1.9.0 // indirect
	go.uber.org/multierr v1.11.0 // indirect
	go.yaml.in/yaml/v2 v2.4.3 // indirect
	go.yaml.in/yaml/v3 v3.0.4 // indirect
	golang.org/x/mod v0.37.0 // indirect
	golang.org/x/net v0.56.0 // indirect
	golang.org/x/oauth2 v0.34.0 // indirect
	golang.org/x/text v0.39.0 // indirect
	golang.org/x/time v0.14.0 // indirect
	google.golang.org/genproto/googleapis/rpc v0.0.0-20260128011058-8636f8732409 // indirect
	google.golang.org/protobuf v1.36.12-0.20260120151049-f2248ac996af // indirect
	gopkg.in/evanphx/json-patch.v4 v4.13.0 // indirect
	gopkg.in/go-jose/go-jose.v2 v2.6.3 // indirect
	gopkg.in/inf.v0 v0.9.1 // indirect
	gopkg.in/square/go-jose.v2 v2.6.0 // indirect
	gopkg.in/yaml.v3 v3.0.1 // indirect
	k8s.io/apiextensions-apiserver v0.36.6 // indirect
	k8s.io/apiserver v0.36.6 // indirect
	k8s.io/cli-runtime v0.36.6 // indirect
	k8s.io/cluster-bootstrap v0.36.6 // indirect
	k8s.io/component-base v0.36.6 // indirect
	k8s.io/component-helpers v0.36.6 // indirect
	k8s.io/cri-client v0.0.0 // indirect
	k8s.io/klog/v2 v2.140.0 // indirect
	k8s.io/kube-openapi v0.0.0-20260317180543-43fb72c5454a // indirect
	k8s.io/streaming v0.36.6 // indirect
	oras.land/oras-go v1.2.5 // indirect
	sigs.k8s.io/json v0.0.0-20250730193827-2d320260d730 // indirect
	sigs.k8s.io/kustomize/api v0.21.1 // indirect
	sigs.k8s.io/randfill v1.0.0 // indirect
	sigs.k8s.io/structured-merge-diff/v6 v6.3.3 // indirect
)

replace (
	k8s.io/api => k8s.io/api v0.36.6
	k8s.io/apiextensions-apiserver => k8s.io/apiextensions-apiserver v0.36.6
	k8s.io/apimachinery => k8s.io/apimachinery v0.36.6
	k8s.io/apiserver => k8s.io/apiserver v0.36.6
	k8s.io/cli-runtime => k8s.io/cli-runtime v0.36.6
	k8s.io/client-go => k8s.io/client-go v0.36.6
	k8s.io/cloud-provider => k8s.io/cloud-provider v0.36.6
	k8s.io/cluster-bootstrap => k8s.io/cluster-bootstrap v0.36.6
	k8s.io/component-base => k8s.io/component-base v0.36.6
	k8s.io/component-helpers => k8s.io/component-helpers v0.36.6
	k8s.io/cri-api => k8s.io/cri-api v0.36.6
	k8s.io/dynamic-resource-allocation => k8s.io/dynamic-resource-allocation v0.36.6
	k8s.io/endpointslice => k8s.io/endpointslice v0.36.6
	k8s.io/kms => k8s.io/kms v0.36.6
	k8s.io/kube-proxy => k8s.io/kube-proxy v0.36.6
	k8s.io/kubectl => k8s.io/kubectl v0.36.6
	k8s.io/kubelet => k8s.io/kubelet v0.36.6
	k8s.io/kubernetes => k8s.io/kubernetes v1.36.6
)

replace (
	github.com/docker/docker => github.com/docker/docker v25.0.1+incompatible
	github.com/imdario/mergo => github.com/imdario/mergo v0.3.13
)

replace (
	github.com/labring/image-cri-shim => ./staging/src/github.com/labring/image-cri-shim
	github.com/labring/lvscare => ./staging/src/github.com/labring/lvscare
	github.com/labring/sealos => ./
)

replace k8s.io/cri-client => k8s.io/cri-client v0.36.6

replace github.com/containers/storage => github.com/containers/storage v1.46.1

replace github.com/containers/common => github.com/containers/common v0.53.1-0.20230613173441-e1ea4d9a74e5

replace github.com/opencontainers/runc => github.com/opencontainers/runc v1.1.12

replace github.com/opencontainers/selinux => github.com/opencontainers/selinux v1.11.0
