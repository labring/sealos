// Copyright © 2022 buildah.
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
	"io/ioutil"
	"os"
	"strings"
	"time"

	"github.com/labring/sealos/pkg/image/types"

	"github.com/containers/buildah"
	"github.com/containers/buildah/define"
	"github.com/containers/buildah/util"
	"github.com/containers/common/pkg/auth"
	"github.com/containers/image/v5/manifest"
	"github.com/containers/image/v5/pkg/compression"
	"github.com/containers/image/v5/transports"
	"github.com/containers/image/v5/transports/alltransports"
	"github.com/containers/storage"
	imgspecv1 "github.com/opencontainers/image-spec/specs-go/v1"
	"github.com/pkg/errors"
	"github.com/sirupsen/logrus"
)

func (*RegistryService) Push(image string) error {
	var src, destSpec string
	iopts := types.PushOptions{
		All:                false,
		Authfile:           auth.GetDefaultAuthFile(),
		BlobCache:          "",
		CertDir:            "",
		Creds:              "",
		Digestfile:         "",
		DisableCompression: false,
		Format:             "",
		CompressionFormat:  "",
		CompressionLevel:   0,
		Rm:                 false,
		Quiet:              false,
		RemoveSignatures:   false,
		SignaturePolicy:    "",
		SignBy:             "",
		TLSVerify:          false,
		EncryptionKeys:     nil,
		EncryptLayers:      nil,
	}
	if err := auth.CheckAuthFile(iopts.Authfile); err != nil {
		return err
	}

	src = image
	destSpec = src

	compress := define.Gzip
	if iopts.DisableCompression {
		compress = define.Uncompressed
	}

	globalFlagResults := newGlobalOptions()
	store, err := getStore(globalFlagResults)
	if err != nil {
		return err
	}

	dest, err := alltransports.ParseImageName(destSpec)

	if err != nil {
		destTransport := strings.Split(destSpec, ":")[0]
		if t := transports.Get(destTransport); t != nil {
			return err
		}

		if strings.Contains(destSpec, "://") {
			return err
		}

		destSpec = "docker://" + destSpec
		dest2, err2 := alltransports.ParseImageName(destSpec)
		if err2 != nil {
			return err
		}
		dest = dest2
		logrus.Debugf("Assuming docker:// as the transport method for DESTINATION: %s", destSpec)
	}

	systemContext, _ := getSystemContext(iopts.TLSVerify)

	var manifestType string
	if iopts.Format != "" {
		switch iopts.Format {
		case "oci":
			manifestType = imgspecv1.MediaTypeImageManifest
		case "v2s1":
			manifestType = manifest.DockerV2Schema1SignedMediaType
		case "v2s2", "docker":
			manifestType = manifest.DockerV2Schema2MediaType
		default:
			return errors.Errorf("unknown format %q. Choose on of the supported formats: 'oci', 'v2s1', or 'v2s2'", iopts.Format)
		}
	}

	encConfig, encLayers, err := getEncryptConfig(iopts.EncryptionKeys, iopts.EncryptLayers)
	if err != nil {
		return errors.Wrapf(err, "unable to obtain encryption config")
	}

	options := buildah.PushOptions{
		Compression:         compress,
		ManifestType:        manifestType,
		SignaturePolicyPath: iopts.SignaturePolicy,
		Store:               store,
		SystemContext:       systemContext,
		BlobDirectory:       iopts.BlobCache,
		RemoveSignatures:    iopts.RemoveSignatures,
		SignBy:              iopts.SignBy,
		MaxRetries:          3,
		RetryDelay:          2 * time.Second,
		OciEncryptConfig:    encConfig,
		OciEncryptLayers:    encLayers,
	}

	if !iopts.Quiet {
		options.ReportWriter = os.Stderr
	}

	if iopts.CompressionFormat != "" {
		algo, err := compression.AlgorithmByName(iopts.CompressionFormat)
		if err != nil {
			return err
		}
		options.CompressionFormat = &algo
	}
	options.CompressionLevel = &iopts.CompressionLevel

	ref, digest, err := buildah.Push(context.TODO(), image, dest, options)
	if err != nil {
		if errors.Cause(err) != storage.ErrImageUnknown {
			// Image might be a manifest so attempt a manifest push
			if manifestsErr := manifestPush(systemContext, store, image, image, iopts); manifestsErr == nil {
				return nil
			}
		}
		return util.GetFailureCause(err, errors.Wrapf(err, "error pushing image %q to %q", image, image))
	}
	if ref != nil {
		logrus.Debugf("pushed image %q with digest %s", ref, digest.String())
	} else {
		logrus.Debugf("pushed image with digest %s", digest.String())
	}

	if iopts.Digestfile != "" {
		if err = ioutil.WriteFile(iopts.Digestfile, []byte(digest.String()), 0644); err != nil {
			return util.GetFailureCause(err, errors.Wrapf(err, "failed to write digest to file %q", iopts.Digestfile))
		}
	}
	return nil
}
