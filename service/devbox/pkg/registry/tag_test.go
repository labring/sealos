package registry_test

import (
	"testing"

	"github.com/labring/sealos/service/devbox/pkg/registry"
)

func TestTag(_ *testing.T) {
	client := &registry.Client{
		Username: "admin",
		Password: "password",
	}
	err := client.Tag(
		"sealos.hub:5000/cbluebird/crk-nginx-test:latest-1",
		"sealos.hub:5000/cbluebird/crk-nginx-test:latest-2",
	)
	if err != nil {
		return
	}
}
