package image

import "strings"

type RegistryOptions struct {
	RegistryAddr string
	UserName     string
	Password     string
	Repository   string
}

type Registry struct {
	ContainerdNamespace string
	SealosUsername      string

	RegistryAddr string
	UserName     string
	Password     string
	Repository   string
	LoginAddress string
}

func NewRegistry(globalRegistry RegistryOptions, envRegistry RegistryOptions, containerNamespace, sealosUsername string) *Registry {
	registry := &Registry{
		ContainerdNamespace: containerNamespace,

		RegistryAddr: checkEmpty(envRegistry.RegistryAddr, globalRegistry.RegistryAddr),
		UserName:     checkEmpty(envRegistry.UserName, globalRegistry.UserName),
		// do not expose password
		Password:       checkEmpty(envRegistry.Password, globalRegistry.Password),
		Repository:     checkEmpty(envRegistry.Repository, globalRegistry.Repository),
		LoginAddress:   checkEmpty(envRegistry.RegistryAddr, globalRegistry.RegistryAddr),
		SealosUsername: sealosUsername,
	}
	if registry.LoginAddress == "docker.io" {
		registry.LoginAddress = ""
	}
	return registry
}

func (r Registry) GetImageRef(image string) string {
	parts := strings.Split(image, "/")
	if len(parts) > 1 {
		return image
	}
	if r.SealosUsername != "" {
		r.SealosUsername += "-"
	}
	if r.Repository == "" {
		return r.RegistryAddr + "/" + r.UserName + "/" + r.SealosUsername + image
	}
	return r.RegistryAddr + "/" + r.UserName + "/" + r.Repository + "/" + r.SealosUsername + image
}

func checkEmpty(value, defaultValue string) string {
	if value == "" {
		return defaultValue
	}
	return value
}
