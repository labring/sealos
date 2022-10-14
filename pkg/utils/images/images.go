/*
Copyright 2022 sealos.

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

package images

import (
	"fmt"
	"strings"

	"github.com/containers/image/v5/docker/reference"
	"github.com/pkg/errors"

	"github.com/labring/sealos/pkg/utils/file"
	"github.com/labring/sealos/pkg/utils/logger"
	str "github.com/labring/sealos/pkg/utils/strings"
)

func LoadImages(imageDir string) ([]string, error) {
	var imageList []string
	if imageDir != "" && file.IsExist(imageDir) {
		paths, err := file.GetFiles(imageDir)
		logger.Info("get files path is %v", paths)
		if err != nil {
			return nil, errors.Wrap(err, "load image list files error")
		}
		for _, p := range paths {
			images, err := file.ReadLines(p)
			if err != nil {
				return nil, errors.Wrap(err, "load image list error")
			}
			imageList = append(imageList, images...)
		}
	}
	imageList = str.RemoveDuplicate(imageList)
	return imageList, nil
}

// crictl images -q
func IsImageID(out, imageID string) bool {
	imageIDs := strings.Split(out, "\n")
	for _, v := range imageIDs {
		if strings.Contains(v, fmt.Sprintf("sha256:%s", imageID)) {
			return true
		}
	}
	return false
}

func NormalizeName(name string) (reference.Named, error) {
	// NOTE: this code is in symmetrie with containers/image/pkg/shortnames.
	ref, err := reference.Parse(name)
	if err != nil {
		return nil, errors.Wrapf(err, "error normalizing name %q", name)
	}

	named, ok := ref.(reference.Named)
	if !ok {
		return nil, errors.Errorf("%q is not a named reference", name)
	}

	// Enforce "localhost" if needed.
	registry := reference.Domain(named)
	if !(strings.ContainsAny(registry, ".:") || registry == "localhost") {
		name = toLocalImageName(ref.String())
	}

	// Another parse which also makes sure that docker.io references are
	// correctly normalized (e.g., docker.io/alpine to
	// docker.io/library/alpine).
	named, err = reference.ParseNormalizedNamed(name)
	if err != nil {
		return nil, err
	}

	if _, hasTag := named.(reference.NamedTagged); hasTag {
		// Strip off the tag of a tagged and digested reference.
		named, err = normalizeTaggedDigestedNamed(named)
		if err != nil {
			return nil, err
		}
		return named, nil
	}
	if _, hasDigest := named.(reference.Digested); hasDigest {
		return named, nil
	}

	// Make sure to tag "latest".
	return reference.TagNameOnly(named), nil
}

// normalizeTaggedDigestedNamed strips the tag off the specified named
// reference iff it is tagged and digested. Note that the tag is entirely
// ignored to match Docker behavior.
func normalizeTaggedDigestedNamed(named reference.Named) (reference.Named, error) {
	_, isTagged := named.(reference.NamedTagged)
	if !isTagged {
		return named, nil
	}
	digested, isDigested := named.(reference.Digested)
	if !isDigested {
		return named, nil
	}

	// Now strip off the tag.
	newNamed := reference.TrimNamed(named)
	// And re-add the digest.
	newNamed, err := reference.WithDigest(newNamed, digested.Digest())
	if err != nil {
		return named, err
	}
	logger.Info("Stripped off tag from tagged and digested reference %q", named.String())
	return newNamed, nil
}

// prefix the specified name with "localhost/".
func toLocalImageName(name string) string {
	return "localhost/" + strings.TrimLeft(name, "/")
}
