module github.com/fanux/sealos/v3

go 1.13

require (
	github.com/fanux/lvscare v1.0.1
	github.com/fanux/sealgate v0.0.5
	github.com/ghodss/yaml v1.0.0
	github.com/imdario/mergo v0.3.9 // indirect
	github.com/mitchellh/go-homedir v1.1.0
	github.com/pkg/errors v0.9.1
	github.com/pkg/sftp v1.11.0
	github.com/spf13/cobra v1.0.0
	github.com/spf13/viper v1.6.3
	github.com/wonderivan/logger v1.0.0
	golang.org/x/crypto v0.0.0-20200429183012-4b2356b1ed79
	gopkg.in/yaml.v2 v2.2.8
	k8s.io/api v0.17.3
	k8s.io/apimachinery v0.17.3
	k8s.io/client-go v0.17.3
	k8s.io/utils v0.0.0-20200414100711-2df71ebbae66 // indirect
)

replace (
	github.com/vishvananda/netlink => github.com/vishvananda/netlink v1.0.0
	github.com/vishvananda/netns => github.com/vishvananda/netns v0.0.0-20171111001504-be1fbeda1936
	github.com/wonderivan/logger => ./pkg/logger
)
