// Copyright © 2022 sealos.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package buildah

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"

	"github.com/containers/common/pkg/config"
	"github.com/containers/storage/pkg/homedir"
	"github.com/containers/storage/pkg/unshare"
	"github.com/containers/storage/types"

	"github.com/labring/sealos/pkg/utils/file"
	"github.com/labring/sealos/pkg/utils/logger"
)

var (
	DefaultConfigFile                  string
	DefaultSignaturePolicyPath         = config.DefaultSignaturePolicyPath
	DefaultRootlessSignaturePolicyPath = "containers/policy.json"
	DefaultGraphRoot                   = "/var/lib/containers/storage"
	DefaultRegistriesFilePath          = "/etc/containers/registries.conf"
	DefaultRootlessRegistriesFilePath  = "containers/registries.conf"
)

func init() {
	var err error
	DefaultConfigFile, err = types.DefaultConfigFile(IsRootless())
	if err != nil {
		logger.Fatal(err)
	}
	if IsRootless() {
		configHome, err := homedir.GetConfigHome()
		if err != nil {
			logger.Fatal(err)
		}
		DefaultSignaturePolicyPath = filepath.Join(configHome, DefaultRootlessSignaturePolicyPath)
		DefaultRegistriesFilePath = filepath.Join(configHome, DefaultRootlessRegistriesFilePath)
	}
}

const defaultPolicy = `
{
    "default": [
        {
            "type": "insecureAcceptAnything"
        }
    ],
    "transports":
        {
            "docker-daemon":
                {
                    "": [{"type":"insecureAcceptAnything"}]
                }
        }
}
`

const defaultRegistries = `unqualified-search-registries = ["docker.io"]

[[registry]]
prefix = "docker.io/labring"
location = "docker.io/labring"
`

const defaultStorageConf = `[storage]
driver = "overlay"
runroot = "/run/containers/storage"
graphroot = "/var/lib/containers/storage"`

func SetupContainerPolicy() error {
	return writeFileIfNotExists(DefaultSignaturePolicyPath, []byte(defaultPolicy))
}

func SetupRegistriesFile() error {
	return writeFileIfNotExists(DefaultRegistriesFilePath, []byte(defaultRegistries))
}

func SetupStorageConfigFile() error {
	if IsRootless() {
		return nil
	}
	return writeFileIfNotExists(DefaultConfigFile, []byte(defaultStorageConf))
}

func writeFileIfNotExists(filename string, data []byte) error {
	_, err := os.Stat(filename)
	if os.IsNotExist(err) {
		logger.Debug("create new buildah config %s cause it's not exist", filename)
		err = file.WriteFile(filename, data)
	}
	return err
}

func DetermineIfRootlessPackagePresent() error {
	if !IsRootless() {
		return nil
	}
	deps := map[string][]string{"uidmap": {"newuidmap", "newgidmap"}, "fuse-overlayfs": {"fuse-overlayfs"}}
	for pkg, executables := range deps {
		for i := range executables {
			if _, err := exec.LookPath(executables[i]); err != nil {
				return fmt.Errorf("executable file '%s' not found in $PATH, consider run in root mode or install package '%s' first", executables[i], pkg)
			}
		}
	}
	return nil
}

func MaybeReexecUsingUserNamespace() error {
	if !IsRootless() {
		return nil
	}
	if _, present := os.LookupEnv("BUILDAH_ISOLATION"); !present {
		if err := os.Setenv("BUILDAH_ISOLATION", "rootless"); err != nil {
			return fmt.Errorf("error setting BUILDAH_ISOLATION=rootless in environment: %v", err)
		}
	}

	// force reexec using the configured ID mappings
	unshare.MaybeReexecUsingUserNamespace(true)
	return nil
}

type Setter func() error

var defaultSetters = []Setter{
	DetermineIfRootlessPackagePresent,
	MaybeReexecUsingUserNamespace,
	SetupContainerPolicy,
	SetupRegistriesFile,
	SetupStorageConfigFile,
}

func TrySetupWithDefaults(setters ...Setter) error {
	if len(setters) == 0 {
		setters = defaultSetters
	}
	for i := range setters {
		if err := setters[i](); err != nil {
			return err
		}
	}
	return nil
}
