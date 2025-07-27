package commit

const (
	namespace = "test.io"
	address   = "unix:///var/run/containerd/containerd.sock"
	dataRoot  = "/var/lib/containerd"
	insecureRegistry = true
	pauseContainerDuringCommit = false
)
