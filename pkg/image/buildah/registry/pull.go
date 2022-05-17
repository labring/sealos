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

package registry

import (
	"context"
	"fmt"
	"os"
	"time"

	"github.com/labring/sealos/pkg/image/types"

	"github.com/containers/buildah"
	"github.com/containers/buildah/define"
	"github.com/containers/common/pkg/auth"
	"github.com/pkg/errors"
)

type RegistryService struct {
}

type pullOptions struct {
	allTags          bool
	authfile         string
	blobCache        string
	certDir          string
	creds            string
	signaturePolicy  string
	quiet            bool
	removeSignatures bool
	tlsVerify        bool
	decryptionKeys   []string
	pullPolicy       string
}

func (*RegistryService) Pull(images ...string) error {
	opt := pullOptions{
		allTags:          false,
		authfile:         auth.GetDefaultAuthFile(),
		blobCache:        "",
		certDir:          "",
		creds:            "",
		signaturePolicy:  "",
		quiet:            false,
		removeSignatures: false,
		tlsVerify:        false,
		decryptionKeys:   nil,
		pullPolicy:       "missing",
	}

	if err := auth.CheckAuthFile(opt.authfile); err != nil {
		return err
	}

	systemContext, _ := getSystemContext(opt.tlsVerify)

	decConfig, err := getDecryptConfig(opt.decryptionKeys)
	if err != nil {
		return errors.Wrapf(err, "unable to obtain decrypt config")
	}

	policy, ok := define.PolicyMap[opt.pullPolicy]
	if !ok {
		return fmt.Errorf("unsupported pull policy %q", "missing")
	}

	globalFlagResults := newGlobalOptions()
	store, err := getStore(globalFlagResults)
	if err != nil {
		return err
	}

	opts := buildah.PullOptions{
		SignaturePolicyPath: opt.signaturePolicy,
		Store:               store,
		SystemContext:       systemContext,
		BlobDirectory:       opt.blobCache,
		AllTags:             opt.allTags,
		ReportWriter:        os.Stderr,
		RemoveSignatures:    opt.removeSignatures,
		MaxRetries:          3,
		RetryDelay:          2 * time.Second,
		OciDecryptConfig:    decConfig,
		PullPolicy:          policy,
	}
	for _, image := range images {
		imageID, err := buildah.Pull(context.TODO(), image, opts)
		if err != nil {
			return err
		}
		fmt.Println(imageID)
	}

	return nil
}

func NewRegistryService() (types.RegistryService, error) {
	return &RegistryService{}, nil
}
