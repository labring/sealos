package registry

import (
	"context"
	"log/slog"

	"github.com/google/go-containerregistry/pkg/name"
	registry "github.com/regclient/regclient"
	"github.com/regclient/regclient/config"
	"github.com/regclient/regclient/types/ref"
)

var TagEngine *Client

type Client struct {
	Username string
	Password string
}

func New(username, password string) {
	TagEngine = &Client{
		Username: username,
		Password: password,
	}
}

func (c *Client) Tag(originImage, newImage string) error {
	original, err := name.ParseReference(originImage)
	if err != nil {
		slog.Error("Error getting origin image info", "Error", err)
		return err
	}
	originalRef := ref.Ref{
		Scheme:     "reg",
		Registry:   original.Context().RegistryStr(),
		Repository: original.Context().RepositoryStr(),
		Tag:        original.Identifier(),
	}

	target, err := name.ParseReference(newImage)
	if err != nil {
		slog.Error("Error getting new image info", "Error", err)
		return err
	}
	targetRef := ref.Ref{
		Scheme:     "reg",
		Registry:   target.Context().RegistryStr(),
		Repository: target.Context().RepositoryStr(),
		Tag:        target.Identifier(),
	}

	originHost := config.HostNewDefName(nil, "http://"+originalRef.Registry)
	originHost.User = c.Username
	originHost.Pass = c.Password
	originHost.TLS = config.TLSDisabled

	targetHost := config.HostNewDefName(nil, "http://"+targetRef.Registry)
	targetHost.User = c.Username
	targetHost.Pass = c.Password
	targetHost.TLS = config.TLSDisabled

	slog.Info("Attempting registry connection",
		"originRegistry", originalRef.Registry,
		"targetRegistry", targetRef.Registry,
		"username", c.Username)

	hub := registry.New(
		registry.WithConfigHost(*originHost),
		registry.WithConfigHost(*targetHost),
	)

	err = hub.ImageCopy(context.Background(), originalRef, targetRef)
	if err != nil {
		slog.Error("Error copying image", "Error", err)
		return err
	}

	slog.Info("Tag success", "OriginImage", originImage, "NewImage", newImage)
	return nil
}
