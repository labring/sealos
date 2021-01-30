module github.com/fanux/sealos

go 1.13

require (
	github.com/aliyun/aliyun-oss-go-sdk v2.1.4+incompatible
	github.com/fanux/lvscare v0.0.0-00010101000000-000000000000
	github.com/fanux/sealgate v0.0.5
	github.com/linuxsuren/cobra-extension v0.0.8
	github.com/pkg/errors v0.9.1
	github.com/pkg/sftp v1.11.0
	github.com/spf13/cobra v1.1.1
	github.com/vishvananda/netlink v1.1.0
	github.com/wonderivan/logger v1.0.0
	go.etcd.io/etcd v0.0.0-20200716221620-18dfb9cca345
	go.uber.org/zap v1.16.0
	golang.org/x/crypto v0.0.0-20200622213623-75b288015ac9
	gopkg.in/yaml.v2 v2.4.0
	k8s.io/api v0.18.0
	k8s.io/apimachinery v0.18.0
	k8s.io/client-go v0.18.0
	sigs.k8s.io/yaml v1.2.0
)

replace (
	github.com/fanux/lvscare => github.com/fanux/lvscare v0.0.0-20201224091410-96651f6cbbad
	github.com/wonderivan/logger => ./pkg/logger
)
