/*
@Date: 2022/5/11 11:44
@Author: Yao
@File : registry
@Software: GoLand
@Description: 这是一个描述
*/
package buildahsdk

import (
	"context"
	"fmt"
	"github.com/containers/buildah/define"
	"github.com/containers/storage"
	"github.com/containers/storage/pkg/unshare"
	"github.com/pkg/errors"
	"os"
	"time"

	"github.com/labring/sealos/pkg/image/types"

	"github.com/containers/buildah"
	is "github.com/containers/image/v5/storage"
	ct "github.com/containers/image/v5/types"
	encconfig "github.com/containers/ocicrypt/config"
	enchelpers "github.com/containers/ocicrypt/helpers"
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
