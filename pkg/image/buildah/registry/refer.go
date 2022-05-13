// Copyright © 2022 buildah.

// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://github.com/containers/buildah/blob/main/LICENSE
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package registry

import (
	"fmt"
	"os"
	"runtime"

	"github.com/containers/buildah/define"
	"github.com/containers/buildah/pkg/parse"
	"github.com/containers/common/pkg/umask"
	"github.com/containers/storage"
	"github.com/containers/storage/pkg/unshare"
	"github.com/pkg/errors"

	is "github.com/containers/image/v5/storage"
	ct "github.com/containers/image/v5/types"
	encconfig "github.com/containers/ocicrypt/config"
	enchelpers "github.com/containers/ocicrypt/helpers"
)

func getDecryptConfig(decryptionKeys []string) (*encconfig.DecryptConfig, error) {
	decConfig := &encconfig.DecryptConfig{}
	if len(decryptionKeys) > 0 {
		// decryption
		dcc, err := enchelpers.CreateCryptoConfig([]string{}, decryptionKeys)
		if err != nil {
			return nil, errors.Wrapf(err, "invalid decryption keys")
		}
		cc := encconfig.CombineCryptoConfigs([]encconfig.CryptoConfig{dcc})
		decConfig = cc.DecryptConfig
	}

	return decConfig, nil
}

func getStore() (storage.Store, error) {
	options, _ := storage.DefaultStoreOptions(unshare.IsRootless(), unshare.GetRootlessUID())
	options.GraphRoot = "/var/lib/containers/storage"
	options.RunRoot = "/run/containers/storage"

	if err := setXDGRuntimeDir(); err != nil {
		return nil, err
	}

	//options.GraphDriverName = options.GraphDriverName
	// If any options setup in config, these should be dropped if user overrode the driver
	options.GraphDriverOptions = []string{}

	if os.Geteuid() != 0 && options.GraphDriverName != "vfs" {
		return nil, errors.Errorf("cannot mount using driver %s in rootless mode. You need to run it in a `buildah unshare` session", options.GraphDriverName)
	}

	umask.Check()

	store, err := storage.GetStore(options)
	if store != nil {
		is.Transport.SetStore(store)
	}
	return store, err
}

func SystemContextFromFlagSet(opts pullOptions) (*ct.SystemContext, error) {
	certDir := opts.certDir
	ctx := &ct.SystemContext{
		DockerCertPath: certDir,
	}
	//tlsVerify := opts.tlsVerify
	//ctx.DockerInsecureSkipTLSVerify = ct.NewOptionalBool(!tlsVerify)
	//ctx.OCIInsecureSkipTLSVerify = !tlsVerify
	//ctx.DockerDaemonInsecureSkipTLSVerify = !tlsVerify
	//
	//ctx.OCIAcceptUncompressedLayers = true
	//
	//creds := opts.creds
	//
	//var err error
	//ctx.DockerAuthConfig, err = parse.AuthConfig(creds)
	//if err != nil {
	//	return nil, err
	//}
	//
	//sigPolicy := opts.signaturePolicy
	//ctx.SignaturePolicyPath = sigPolicy
	//
	//authfile := opts.authfile
	//ctx.AuthFilePath = getAuthFile(authfile)
	//
	//regConf := ""
	//ctx.SystemRegistriesConfPath = regConf
	//
	//regConfDir := ""
	//ctx.RegistriesDirPath = regConfDir
	//
	//shortNameAliasConf := ""
	//ctx.UserShortNameAliasConfPath = shortNameAliasConf

	ctx.DockerRegistryUserAgent = fmt.Sprintf("Buildah/%s", define.Version)

	ctx.OSChoice = runtime.GOOS

	ctx.ArchitectureChoice = runtime.GOARCH

	ctx.VariantChoice = ""

	ctx.BigFilesTemporaryDir = parse.GetTempDir()
	return ctx, nil
}

/*
func getAuthFile(authfile string) string {
	if authfile != "" {
		return authfile
	}
	return os.Getenv("REGISTRY_AUTH_FILE")
}*/

// setXDGRuntimeDir sets XDG_RUNTIME_DIR when if it is unset under rootless
func setXDGRuntimeDir() error {
	if unshare.IsRootless() && os.Getenv("XDG_RUNTIME_DIR") == "" {
		runtimeDir, err := storage.GetRootlessRuntimeDir(unshare.GetRootlessUID())
		if err != nil {
			return err
		}
		if err := os.Setenv("XDG_RUNTIME_DIR", runtimeDir); err != nil {
			return errors.New("could not set XDG_RUNTIME_DIR")
		}
	}
	return nil
}
