package constants

const (
	DevboxLabelPrefix = "k8s:app.kubernetes.io/name="
	OSSLabelPrefix    = "k8s:io.cilium.k8s.namespace.labels.app.kubernetes.io/created-by="
	DBLabelPrefix     = "k8s:app.kubernetes.io/instance="
	AppLabelPrefix    = "k8s:app="
	// TODO: AI PROXY Label
)

const (
	DevboxType   = "devbox"
	OSSType      = "oss"
	DatabaseType = "database"
	AppType      = "app"
)
