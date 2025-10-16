package main

import (
	"sync"
)

type reason = string

const (
	ReasonImageNotFound     reason = "image_not_found"
	ReasonProxyError        reason = "proxy_error"
	ReasonUnauthorized      reason = "unauthorized"
	ReasonTLSHandshake      reason = "tls_handshake_error"
	ReasonIOTimeout         reason = "io_timeout"
	ReasonConnectionRefused reason = "connection_refused"
	ReasonNetworkError      reason = "network_error"
	ReasonBackOff           reason = "back_off_pulling_image"
	ReasonUnknown           reason = "unknown"
)

// podInfo 包含失败原因、节点信息及锁
type podInfo struct {
	mu        sync.Mutex
	reasons   map[string]failureInfo // key: container name, value: failureInfo with node info
	namespace string
	podName   string
}

// failureInfo 现在包含节点信息和镜像信息,确保 Dec 操作在正确的节点上执行
type failureInfo struct {
	registry string // 镜像仓库
	nodeName string // 节点信息
	image    string // 镜像信息
	reason   reason // 失败原因
}

// slowPullInfo 记录慢拉取的信息
type slowPullInfo struct {
	namespace string
	podName   string
	nodeName  string
	registry  string
	image     string
}
