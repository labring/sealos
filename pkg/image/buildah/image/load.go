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

package image

import (
	"fmt"
	"os"
	"runtime"

	"github.com/containers/buildah"
	"github.com/containers/buildah/define"
	buildahcli "github.com/containers/buildah/pkg/cli"
	"github.com/containers/buildah/pkg/parse"
	"github.com/containers/common/pkg/auth"
	image_types "github.com/containers/image/v5/types"
	labring_types "github.com/labring/sealos/pkg/image/types"
	"github.com/labring/sealos/pkg/utils/logger"
	"github.com/pkg/errors"
)

func (d *ImageService) Load(archiveName string) error {
	if err := buildahcli.VerifyFlagsArgsOrder([]string{archiveName}); err != nil {
		return err
	}
	if err := auth.CheckAuthFile(d.pullOpts.Authfile); err != nil {
		return err
	}

	store := *d.store
	systemContext := &image_types.SystemContext{}

	platforms := []struct{ OS, Arch, Variant string }{{d.pullOpts.OS, d.pullOpts.Arch, d.pullOpts.Variant}}

	if len(platforms) > 1 {
		logger.Warn("ignoring platforms other than %+v: %+v", platforms[0], platforms[1:])
	}
	decConfig, err := getDecryptConfig(d.pullOpts.DecryptionKeys)
	if err != nil {
		return errors.Wrapf(err, "unable to obtain decrypt config")
	}

	policy, ok := define.PolicyMap[d.pullOpts.PullPolicy]
	if !ok {
		return fmt.Errorf("unsupported pull policy %q", d.pullOpts.PullPolicy)
	}
	options := buildah.PullOptions{
		SignaturePolicyPath: d.pullOpts.SignaturePolicy,
		Store:               store,
		SystemContext:       systemContext,
		BlobDirectory:       d.pullOpts.BlobCache,
		AllTags:             d.pullOpts.AllTags,
		ReportWriter:        os.Stderr,
		RemoveSignatures:    d.pullOpts.RemoveSignatures,
		MaxRetries:          maxPullPushRetries,
		RetryDelay:          pullPushRetryDelay,
		OciDecryptConfig:    decConfig,
		PullPolicy:          policy,
	}
	if d.pullOpts.Quiet {
		options.ReportWriter = nil // Turns off logging output
	}
	id, err := buildah.Pull(getContext(), fmt.Sprintf("oci-archive:%s", archiveName), options)
	if err != nil {
		return err
	}
	fmt.Printf("%s\n", id)
	return nil
}

func newPullOptions() *labring_types.PullOptions {
	return &labring_types.PullOptions{
		AllTags:          false,
		Authfile:         auth.GetDefaultAuthFile(),
		BlobCache:        "",
		CertDir:          "",
		Creds:            "",
		PullPolicy:       "missing",
		SignaturePolicy:  "",
		RemoveSignatures: false,
		DecryptionKeys:   nil,
		TLSVerify:        true,
		Arch:             runtime.GOARCH,
		OS:               runtime.GOOS,
		Platform:         []string{parse.DefaultPlatform()},
		Variant:          "",
	}
}
