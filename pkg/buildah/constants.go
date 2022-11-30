package buildah

const (
	OCIArchive    string = "oci-archive"
	DockerArchive string = "docker-archive"
)

var DefaultTransport = DockerArchive
