package proxy

import "errors"

var (
	// ErrNotInitialized indicates the required ConfigMap does not exist yet.
	ErrNotInitialized = errors.New("image-cri-shim proxy has not been initialized")
	// ErrConfigDataMissing means the ConfigMap exists but carries no usable configuration payload.
	ErrConfigDataMissing = errors.New("image-cri-shim proxy config data is missing")
	// ErrInvalidConfig indicates the stored YAML cannot be parsed into a shim config.
	ErrInvalidConfig = errors.New("image-cri-shim proxy config is invalid")
	// ErrRegistryNotFound is returned when attempting to delete a non-existing registry entry.
	ErrRegistryNotFound = errors.New("registry entry not found")
	// ErrInvalidRegistryAddress signals the user provided an empty address when mutating registries.
	ErrInvalidRegistryAddress = errors.New("registry address cannot be empty")
	// ErrDaemonSetNotFound indicates the image-cri-shim DaemonSet does not exist.
	ErrDaemonSetNotFound = errors.New("image-cri-shim DaemonSet not found")
	// ErrDaemonSetInvalidContainer means the DaemonSet template does not define any containers.
	ErrDaemonSetInvalidContainer = errors.New("image-cri-shim DaemonSet has no container to update")
)
