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

// podInfo contains failure reasons, node information and lock
type podInfo struct {
	mu        sync.Mutex
	reasons   map[string]failureInfo // key: container name, value: failureInfo with node info
	namespace string
	podName   string
}

// failureInfo now includes node and image information to ensure Dec operations execute on the correct node
type failureInfo struct {
	registry string // Image registry
	nodeName string // Node information
	image    string // Image information
	reason   reason // Failure reason
}

// slowPullInfo records slow pull information
type slowPullInfo struct {
	namespace string
	podName   string
	nodeName  string
	registry  string
	image     string
}
