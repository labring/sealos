package main

import (
	"os"
	"testing"

	"github.com/stretchr/testify/assert"

	configpkg "github.com/labring/sealos/controllers/user/controllers/helper/config"
)

func TestSetConfigToEnv(t *testing.T) {
	tests := []struct {
		name    string
		cfg     configpkg.Config
		wantErr bool
	}{
		{
			name: "valid config",
			cfg: configpkg.Config{
				Global: configpkg.Global{
					CloudDomain: "cloud.example.com",
				},
				Kube: configpkg.Kube{
					APIServerPort: "6443",
				},
			},
			wantErr: false,
		},
		{
			name: "empty config",
			cfg: configpkg.Config{
				Global: configpkg.Global{
					CloudDomain: "",
				},
				Kube: configpkg.Kube{
					APIServerPort: "",
				},
			},
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Clean environment before each test
			os.Unsetenv("SEALOS_CLOUD_HOST")
			os.Unsetenv("APISERVER_PORT")

			err := setConfigToEnv(tt.cfg)
			if tt.wantErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
				assert.Equal(t, tt.cfg.Global.CloudDomain, os.Getenv("SEALOS_CLOUD_HOST"))
				assert.Equal(t, tt.cfg.Kube.APIServerPort, os.Getenv("APISERVER_PORT"))
			}
		})
	}
}

func TestMain(m *testing.M) {
	// Setup test environment
	code := m.Run()
	// Cleanup
	os.Unsetenv("SEALOS_CLOUD_HOST")
	os.Unsetenv("APISERVER_PORT")
	os.Exit(code)
}
