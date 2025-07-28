package commit

const (
	Namespace                  = "sealos.io"
	DefaultContainerdAddress   = "unix:///var/run/containerd/containerd.sock"
	DataRoot                   = "/var/lib/containerd"
	InsecureRegistry           = true
	PauseContainerDuringCommit = false

	AnnotationKeyContentID               = "devbox.sealos.io/content-id"
	AnnotationKeyNamespace               = "namespace"
	AnnotationKeyImageName               = "image.name"
	DevboxOptionsRemoveBaseImageTopLayer = true
)
