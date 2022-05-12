/*
Copyright 2022 191557539@qq.com.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
package registry

import (
	"context"
	"fmt"
	"os"
	"time"

	"github.com/labring/sealos/pkg/image/types"

	"github.com/containers/buildah"
	"github.com/containers/buildah/define"
	is "github.com/containers/image/v5/storage"
	ct "github.com/containers/image/v5/types"
	encconfig "github.com/containers/ocicrypt/config"
	enchelpers "github.com/containers/ocicrypt/helpers"
	"github.com/containers/storage"
	"github.com/containers/storage/pkg/unshare"
	"github.com/pkg/errors"
)

type RegistryService struct {
}

func (*RegistryService) Login(domain, username, passwd string) error {
	return nil
}

func (*RegistryService) Logout(domain string) error {
	return nil
}

func (*RegistryService) Pull(images ...string) error {
	decConfig, err := getDecryptConfig(nil)
	if err != nil {
		return errors.Wrapf(err, "unable to obtain decrypt config")
	}

	policy, ok := define.PolicyMap["missing"]
	if !ok {
		return fmt.Errorf("unsupported pull policy %q", "missing")
	}

	store, err := getStore()
	if err != nil {
		return err
	}

	opts := buildah.PullOptions{
		SignaturePolicyPath: "",
		Store:               store,
		SystemContext:       &ct.SystemContext{},
		BlobDirectory:       "",
		AllTags:             false,
		ReportWriter:        os.Stderr,
		RemoveSignatures:    false,
		MaxRetries:          3,
		RetryDelay:          2 * time.Second,
		OciDecryptConfig:    decConfig,
		PullPolicy:          policy,
	}
	for _, image := range images {
		imageId, err := buildah.Pull(context.Background(), image, opts)
		if err != nil {
			return err
		}
		fmt.Println(imageId)
	}

	return nil
}

func (*RegistryService) Push(image string) error {
	return nil
}

func NewRegistryService() (types.RegistryService, error) {
	return &RegistryService{}, nil
}

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
	options, err := storage.DefaultStoreOptions(unshare.IsRootless(), unshare.GetRootlessUID())

	store, err := storage.GetStore(options)
	if store != nil {
		is.Transport.SetStore(store)
	}
	return store, err
}
