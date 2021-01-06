module github.com/fanux/sealos

go 1.13

require (
	github.com/aliyun/aliyun-oss-go-sdk v2.1.4+incompatible
	github.com/baiyubin/aliyun-sts-go-sdk v0.0.0-20180326062324-cfa1a18b161f // indirect
	github.com/coreos/go-semver v0.3.0 // indirect
	github.com/dustin/go-humanize v1.0.0 // indirect
	github.com/fanux/lvscare v0.0.0-00010101000000-000000000000
	github.com/fanux/sealgate v0.0.5
	github.com/ghodss/yaml v1.0.0
	github.com/gorilla/websocket v1.4.2 // indirect
	github.com/pkg/errors v0.9.1
	github.com/pkg/sftp v1.11.0
	github.com/satori/go.uuid v1.2.0 // indirect
	github.com/spf13/cobra v1.0.0
	github.com/vishvananda/netlink v1.1.0
	github.com/wangle201210/githubapi v0.0.0-20200804144924-cde7bbdc36ab
	github.com/wonderivan/logger v1.0.0
	github.com/ysicing/ext v0.0.0-20200924074735-656a6ff80db4
	go.etcd.io/etcd v0.0.0-20200716221620-18dfb9cca345
	go.uber.org/zap v1.13.0
	golang.org/x/crypto v0.0.0-20200622213623-75b288015ac9
	golang.org/x/sys v0.0.0-20200923182605-d9f96fdee20d // indirect
	golang.org/x/text v0.3.3 // indirect
	google.golang.org/appengine v1.6.1 // indirect
	gopkg.in/ini.v1 v1.61.0 // indirect
	gopkg.in/yaml.v2 v2.3.0
	k8s.io/api v0.18.0
	k8s.io/apimachinery v0.18.0
	k8s.io/client-go v0.18.0
)

replace (
	github.com/fanux/lvscare => github.com/fanux/lvscare v0.0.0-20201224091410-96651f6cbbad
	github.com/wonderivan/logger => ./pkg/logger
)
