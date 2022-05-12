// Copyright © 2022 buildah.
//
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

package image

import (
	"bytes"
	"context"
	"encoding/json"

	"github.com/containers/buildah/util"
	cp "github.com/containers/image/v5/copy"

	"io/ioutil"
	"os"

	"github.com/containers/common/libimage"
	"github.com/containers/common/libimage/manifests"
	"github.com/containers/image/v5/manifest"
	"github.com/containers/image/v5/transports"
	"github.com/containers/image/v5/transports/alltransports"
	"github.com/containers/image/v5/types"
	"github.com/containers/storage"
	labring_types "github.com/labring/sealos/pkg/image/types"
	imgspecv1 "github.com/opencontainers/image-spec/specs-go/v1"
	"github.com/pkg/errors"
	"github.com/sirupsen/logrus"
)

func manifestInspect(ctx context.Context, store storage.Store, systemContext *types.SystemContext, imageSpec string) (string, error) {
	runtime, err := libimage.RuntimeFromStore(store, &libimage.RuntimeOptions{SystemContext: systemContext})
	if err != nil {
		return "", err
	}

	printManifest := func(manifest []byte) (string, error) {
		var b bytes.Buffer
		err = json.Indent(&b, manifest, "", "    ")
		if err != nil {
			return "", errors.Wrapf(err, "error rendering manifest for display")
		}
		//fmt.Printf("%s\n", b.String())
		return b.String(), nil
	}

	// Before doing a remote lookup, attempt to resolve the manifest list
	// locally.
	manifestList, err := runtime.LookupManifestList(imageSpec)
	switch errors.Cause(err) {
	case storage.ErrImageUnknown, libimage.ErrNotAManifestList:
		// We need to do the remote inspection below.
	case nil:
		schema2List, err := manifestList.Inspect()
		if err != nil {
			return "", err
		}

		rawSchema2List, err := json.Marshal(schema2List)
		if err != nil {
			return "", err
		}

		return printManifest(rawSchema2List)

	default:
		// Fatal error.
		return "", err
	}

	// TODO: at some point `libimage` should support resolving manifests
	// like that.  Similar to `libimage.Runtime.LookupImage` we could
	// implement a `*.LookupImageIndex`.
	refs, err := util.ResolveNameToReferences(store, systemContext, imageSpec)
	if err != nil {
		logrus.Debugf("error parsing reference to image %q: %v", imageSpec, err)
	}

	if ref, _, err := util.FindImage(store, "", systemContext, imageSpec); err == nil {
		refs = append(refs, ref)
	} else if ref, err := alltransports.ParseImageName(imageSpec); err == nil {
		refs = append(refs, ref)
	}
	if len(refs) == 0 {
		return "", errors.Errorf("error locating images with names %v", imageSpec)
	}

	var (
		latestErr error
		result    []byte
	)

	appendErr := func(e error) {
		if latestErr == nil {
			latestErr = e
		} else {
			latestErr = errors.Wrapf(latestErr, "tried %v", e)
		}
	}

	for _, ref := range refs {
		logrus.Debugf("Testing reference %q for possible manifest", transports.ImageName(ref))

		src, err := ref.NewImageSource(ctx, systemContext)
		if err != nil {
			appendErr(errors.Wrapf(err, "reading image %q", transports.ImageName(ref)))
			continue
		}
		defer src.Close()

		manifestBytes, manifestType, err := src.GetManifest(ctx, nil)
		if err != nil {
			appendErr(errors.Wrapf(err, "loading manifest %q", transports.ImageName(ref)))
			continue
		}

		if !manifest.MIMETypeIsMultiImage(manifestType) {
			appendErr(errors.Errorf("manifest is of type %s (not a list type)", manifestType))
			continue
		}
		result = manifestBytes
		break
	}
	if len(result) == 0 && latestErr != nil {
		return "", latestErr
	}

	return printManifest(result)
}

func manifestPush(systemContext *types.SystemContext, store storage.Store, listImageSpec, destSpec string, opts *labring_types.PushOptions) error {
	runtime, err := libimage.RuntimeFromStore(store, &libimage.RuntimeOptions{SystemContext: systemContext})
	if err != nil {
		return err
	}

	manifestList, err := runtime.LookupManifestList(listImageSpec)
	if err != nil {
		return err
	}

	_, list, err := manifests.LoadFromImage(store, manifestList.ID())
	if err != nil {
		return err
	}

	dest, err := alltransports.ParseImageName(destSpec)
	if err != nil {
		return err
	}

	var manifestType string
	if opts.Format != "" {
		switch opts.Format {
		case "oci":
			manifestType = imgspecv1.MediaTypeImageManifest
		case "v2s2", "docker":
			manifestType = manifest.DockerV2Schema2MediaType
		default:
			return errors.Errorf("unknown format %q. Choose on of the supported formats: 'oci' or 'v2s2'", opts.Format)
		}
	}

	options := manifests.PushOptions{
		Store:              store,
		SystemContext:      systemContext,
		ImageListSelection: cp.CopySpecificImages,
		Instances:          nil,
		RemoveSignatures:   opts.RemoveSignatures,
		SignBy:             opts.SignBy,
		ManifestType:       manifestType,
	}
	if opts.All {
		options.ImageListSelection = cp.CopyAllImages
	}
	if !opts.Quiet {
		options.ReportWriter = os.Stderr
	}

	_, digest, err := list.Push(getContext(), dest, options)

	if err == nil && opts.Rm {
		_, err = store.DeleteImage(manifestList.ID(), true)
	}

	if opts.Digestfile != "" {
		if err = ioutil.WriteFile(opts.Digestfile, []byte(digest.String()), 0644); err != nil {
			return util.GetFailureCause(err, errors.Wrapf(err, "failed to write digest to file %q", opts.Digestfile))
		}
	}

	return err
}
