/*
Copyright 2022 cuisongliu@qq.com.

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

package image

import (
	"context"
	"sort"
	"time"

	"github.com/containers/buildah/pkg/formats"
	"github.com/containers/common/libimage"
	image_types "github.com/containers/image/v5/types"

	"github.com/docker/go-units"
	"github.com/labring/sealos/pkg/image/types"

	"github.com/pkg/errors"
)

const none = "<none>"

var imagesHeader = map[string]string{
	"Name":      "REPOSITORY",
	"Tag":       "TAG",
	"ID":        "IMAGE ID",
	"CreatedAt": "CREATED",
	"Size":      "SIZE",
	"ReadOnly":  "R/O",
	"History":   "HISTORY",
}

func (d *ImageService) ListImages() error {
	store := *d.store
	systemContext := &image_types.SystemContext{}

	runtime, err := libimage.RuntimeFromStore(store, &libimage.RuntimeOptions{SystemContext: systemContext})
	if err != nil {
		return err
	}

	iopts := d.listImageOpts
	ctx := context.Background()
	options := &libimage.ListImagesOptions{}
	if len(iopts.Filter) > 0 {
		options.Filters = iopts.Filter
	}
	if !iopts.All {
		options.Filters = append(options.Filters, "intermediate=false")
	}

	images, err := runtime.ListImages(ctx, d.listImageOpts.Names, options)
	if err != nil {
		return err
	}

	if iopts.Quiet && iopts.Format != "" {
		return errors.Errorf("quiet and format are mutually exclusive")
	}

	opts := types.ImageOptions{
		All:       iopts.All,
		Digests:   iopts.Digests,
		Format:    iopts.Format,
		JSON:      iopts.JSON,
		NoHeading: iopts.NoHeading,
		Truncate:  !iopts.Truncate,
		Quiet:     iopts.Quiet,
		History:   iopts.History,
	}

	if opts.JSON {
		return formatImagesJSON(images, opts)
	}

	return formatImages(images, opts)
}

type imagesSorted []types.ImageOutputParams

func (a imagesSorted) Less(i, j int) bool {
	return a[i].CreatedAtRaw.After(a[j].CreatedAtRaw)
}

func (a imagesSorted) Len() int {
	return len(a)
}

func (a imagesSorted) Swap(i, j int) {
	a[i], a[j] = a[j], a[i]
}

func formatImages(images []*libimage.Image, opts types.ImageOptions) error {
	var outputData imagesSorted

	for _, img := range images {
		var outputParam types.ImageOutputParams
		size, err := img.Size()
		if err != nil {
			return err
		}
		created := img.Created()
		outputParam.CreatedAtRaw = created
		outputParam.Created = created.Unix()
		outputParam.CreatedAt = units.HumanDuration(time.Since(created)) + " ago"
		outputParam.Digest = img.Digest().String()
		outputParam.ID = truncateID(img.ID(), opts.Truncate)
		outputParam.Size = formattedSize(size)
		outputParam.ReadOnly = img.IsReadOnly()

		repoTags, err := img.NamedRepoTags()
		if err != nil {
			return err
		}

		nameTagPairs, err := libimage.ToNameTagPairs(repoTags)
		if err != nil {
			return err
		}

		for _, pair := range nameTagPairs {
			newParam := outputParam
			newParam.Name = pair.Name
			newParam.Tag = pair.Tag
			newParam.History = formatHistory(img.NamesHistory(), pair.Name, pair.Tag)
			outputData = append(outputData, newParam)
			// `images -q` should a given ID only once.
			if opts.Quiet {
				break
			}
		}
	}

	sort.Sort(outputData)
	out := formats.StdoutTemplateArray{Output: imagesToGeneric(outputData), Template: outputHeader(opts), Fields: imagesHeader}
	return formats.Writer(out).Out()
}
