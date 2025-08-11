package commit

import "time"

const (
	DefaultNamespace           = "sealos.io"
	DefaultContainerdAddress   = "unix:///var/run/containerd/containerd.sock"
	DefaultRuntime             = "io.containerd.runc.v2"
	DefaultNerdctlDataRoot     = "/var/lib/containerd"
	DefaultNerdctlHostsDir     = "/etc/containerd/certs.d"
	DefaultDevboxSnapshotter   = "devbox"
	DefaultNetworkMode         = "none"
	InsecureRegistry           = true
	PauseContainerDuringCommit = false

	AnnotationKeyNamespace               = "namespace"
	AnnotationKeyImageName               = "image.name"
	DevboxOptionsRemoveBaseImageTopLayer = true
	AnnotationImageFromValue             = "true"
	AnnotationUseLimitValue              = "1Gi"

	SnapshotLabelPrefix  = "containerd.io/snapshot/devbox-"
	ContainerLabelPrefix = "devbox.sealos.io/"
	RemoveContentIDkey   = "containerd.io/snapshot/devbox-remove-content-id"

	DefaultMaxRetries = 3
	DefaultRetryDelay = 5 * time.Second
)
