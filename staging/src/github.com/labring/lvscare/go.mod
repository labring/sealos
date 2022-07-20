module github.com/labring/lvscare

go 1.18

replace github.com/vishvananda/netlink => github.com/vishvananda/netlink v1.1.0

require (
	github.com/lithammer/dedent v1.1.0
	github.com/moby/ipvs v1.0.2
	github.com/vishvananda/netlink v1.1.1-0.20210330154013-f5de75959ad5
)

require (
	github.com/sirupsen/logrus v1.8.1 // indirect
	github.com/spf13/pflag v1.0.5 // indirect
	github.com/vishvananda/netns v0.0.0-20210104183010-2eb08e3e575f // indirect
	go.uber.org/atomic v1.7.0 // indirect
	go.uber.org/multierr v1.6.0 // indirect
	go.uber.org/zap v1.21.0 // indirect
	golang.org/x/sys v0.0.0-20220704084225-05e143d24a9e // indirect
	gopkg.in/natefinch/lumberjack.v2 v2.0.0 // indirect
)

require github.com/labring/sealos v0.0.0-00010101000000-000000000000

replace github.com/labring/sealos => ../../../../../
