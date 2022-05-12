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
	"io/ioutil"
	"os"
	"strings"

	"github.com/containers/buildah"
	"github.com/containers/buildah/define"
	"github.com/containers/buildah/util"
	"github.com/containers/common/pkg/auth"
	"github.com/containers/image/v5/manifest"
	"github.com/containers/image/v5/pkg/compression"
	"github.com/containers/image/v5/transports"
	"github.com/containers/image/v5/transports/alltransports"
	image_types "github.com/containers/image/v5/types"
	"github.com/containers/storage"
	imgspecv1 "github.com/opencontainers/image-spec/specs-go/v1"
	"github.com/pkg/errors"
	"github.com/sirupsen/logrus"

	labring_types "github.com/labring/sealos/pkg/image/types"
)

// using buildah push

func (d *ImageService) Save(imageName, archiveName string) error {
	if err := auth.CheckAuthFile(d.pushOpts.Authfile); err != nil {
		return err
	}
	compress := define.Gzip
	if d.pushOpts.DisableCompression {
		compress = define.Uncompressed
	}
	var manifestType string
	if d.pushOpts.Format != "" {
		switch d.pushOpts.Format {
		case "oci":
			manifestType = imgspecv1.MediaTypeImageManifest
		case "v2s1":
			manifestType = manifest.DockerV2Schema1SignedMediaType
		case "v2s2", "docker":
			manifestType = manifest.DockerV2Schema2MediaType
		default:
			return errors.Errorf("unknown format %q. Choose on of the supported formats: 'oci', 'v2s1', or 'v2s2'", d.pushOpts.Format)
		}
	}
	store := *d.store
	systemContext := &image_types.SystemContext{}
	encConfig, encLayers, err := getEncryptConfig(d.pushOpts.EncryptionKeys, d.pushOpts.EncryptLayers)
	if err != nil {
		return errors.Wrapf(err, "unable to obtain encryption config")
	}
	options := buildah.PushOptions{
		Compression:         compress,
		ManifestType:        manifestType,
		SignaturePolicyPath: d.pushOpts.SignaturePolicy,
		Store:               store,
		SystemContext:       systemContext,
		BlobDirectory:       d.pushOpts.BlobCache,
		RemoveSignatures:    d.pushOpts.RemoveSignatures,
		SignBy:              d.pushOpts.SignBy,
		MaxRetries:          maxPullPushRetries,
		RetryDelay:          pullPushRetryDelay,
		OciEncryptConfig:    encConfig,
		OciEncryptLayers:    encLayers,
	}
	if !d.pushOpts.Quiet {
		options.ReportWriter = os.Stderr
	}
	if d.pushOpts.CompressionFormat != "" {
		algo, err := compression.AlgorithmByName(d.pushOpts.CompressionFormat)
		if err != nil {
			return err
		}
		options.CompressionFormat = &algo
	}
	options.CompressionLevel = &d.pushOpts.CompressionLevel
	defaultTransport := "oci-archive"

	// Default here
	destSpec := fmt.Sprintf("%s:%s:%s", defaultTransport, archiveName, imageName)
	dest, err := alltransports.ParseImageName(destSpec)
	// add the docker:// transport to see if they neglected it.
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

	ref, digest, err := buildah.Push(getContext(), imageName, dest, options)
	if err != nil {
		if errors.Cause(err) != storage.ErrImageUnknown {
			// Image might be a manifest so attempt a manifest push
			if manifestsErr := manifestPush(systemContext, store, imageName, destSpec, d.pushOpts); manifestsErr == nil {
				return nil
			}
		}
		return util.GetFailureCause(err, errors.Wrapf(err, "error pushing image %q to %q", imageName, archiveName))
	}
	if ref != nil {
		logrus.Debugf("pushed image %q with digest %s", ref, digest.String())
	} else {
		logrus.Debugf("pushed image with digest %s", digest.String())
	}
	if d.pushOpts.Digestfile != "" {
		if err = ioutil.WriteFile(d.pushOpts.Digestfile, []byte(digest.String()), 0644); err != nil {
			return util.GetFailureCause(err, errors.Wrapf(err, "failed to write digest to file %q", d.pushOpts.Digestfile))
		}
	}
	return nil
}

func newPushOptions() *labring_types.PushOptions {
	return &labring_types.PushOptions{
		All:                false,
		Authfile:           auth.GetDefaultAuthFile(),
		BlobCache:          "",
		CertDir:            "",
		Creds:              "",
		Digestfile:         "",
		DisableCompression: false,
		Format:             "oci",
		CompressionFormat:  "",
		CompressionLevel:   0,
		Quiet:              false,
		Rm:                 false,
		SignBy:             "",
		SignaturePolicy:    "",
		RemoveSignatures:   false,
		EncryptionKeys:     nil,
		TLSVerify:          true,
		EncryptLayers:      nil,
	}
}
