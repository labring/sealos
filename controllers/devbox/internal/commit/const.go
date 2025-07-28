package commit

const (
	DefaultNamespace           = "sealos.io"
	DefaultContainerdAddress   = "unix:///var/run/containerd/containerd.sock"
	DefaultDataRoot            = "/var/lib/containerd"
	InsecureRegistry           = true
	PauseContainerDuringCommit = false

	AnnotationKeyContentID               = "devbox.sealos.io/content-id"
	AnnotationKeyNamespace               = "namespace"
	AnnotationKeyImageName               = "image.name"
	AnnotationImageFrom                  = "devbox.sealos.io/init"
	AnnotationUseLimit                   = "devbox.sealos.io/storage-limit"
	DevboxOptionsRemoveBaseImageTopLayer = true
	AnnotationImageFromValue             = "true"
	AnnotationUseLimitValue              = "1Gi"
)
