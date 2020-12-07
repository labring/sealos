module github.com/fanux/sealos

go 1.13

require (
	github.com/aliyun/aliyun-oss-go-sdk v2.1.4+incompatible
	github.com/baiyubin/aliyun-sts-go-sdk v0.0.0-20180326062324-cfa1a18b161f // indirect
	github.com/dustin/go-humanize v1.0.0 // indirect
	github.com/fanux/lvscare v0.0.0-00010101000000-000000000000
	github.com/fanux/sealgate v0.0.5
	github.com/fsnotify/fsnotify v1.4.9 // indirect
	github.com/ghodss/yaml v1.0.0
	github.com/magiconair/properties v1.8.4 // indirect
	github.com/mitchellh/go-homedir v1.1.0
	github.com/mitchellh/mapstructure v1.3.3 // indirect
	github.com/pelletier/go-toml v1.8.1 // indirect
	github.com/pkg/errors v0.9.1
	github.com/pkg/sftp v1.11.0
	github.com/satori/go.uuid v1.2.0 // indirect
	github.com/spf13/afero v1.4.0 // indirect
	github.com/spf13/cast v1.3.1 // indirect
	github.com/spf13/cobra v1.0.0
	github.com/spf13/jwalterweatherman v1.1.0 // indirect
	github.com/spf13/viper v1.7.1
	github.com/vishvananda/netlink v1.1.0
	github.com/wangle201210/githubapi v0.0.0-20200804144924-cde7bbdc36ab
	github.com/wonderivan/logger v1.0.0
	github.com/ysicing/ext v0.0.0-20200924074735-656a6ff80db4
	go.etcd.io/etcd v0.0.0-20200716221620-18dfb9cca345
	go.uber.org/zap v1.13.0
	golang.org/x/crypto v0.0.0-20200622213623-75b288015ac9
	golang.org/x/sys v0.0.0-20200923182605-d9f96fdee20d // indirect
	gopkg.in/ini.v1 v1.61.0 // indirect
	gopkg.in/yaml.v2 v2.3.0
	k8s.io/api v0.18.0
	k8s.io/apimachinery v0.18.0
	k8s.io/client-go v0.18.0
)

replace (
	github.com/docker/libnetwork => github.com/docker/libnetwork v0.8.0-dev.2.0.20190925143933-c8a5fca4a652
	github.com/fanux/lvscare => github.com/fanux/lvscare v0.0.0-20200331025051-a9c95851a817
	github.com/vishvananda/netlink => github.com/vishvananda/netlink v1.0.0
	github.com/vishvananda/netns => github.com/vishvananda/netns v0.0.0-20171111001504-be1fbeda1936
	github.com/wonderivan/logger => ./pkg/logger
)
