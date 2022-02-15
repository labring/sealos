// Copyright 2020 The Kubernetes Authors.
// SPDX-License-Identifier: Apache-2.0

package imagetag

import (
	"sigs.k8s.io/kustomize/api/filters/filtersutil"
	"sigs.k8s.io/kustomize/api/image"
	"sigs.k8s.io/kustomize/api/types"
	"sigs.k8s.io/kustomize/kyaml/yaml"
)

// imageTagUpdater is an implementation of the kio.Filter interface
// that will update the value of the yaml node based on the provided
// ImageTag if the current value matches the format of an image reference.
type imageTagUpdater struct {
	Kind            string      `yaml:"kind,omitempty"`
	ImageTag        types.Image `yaml:"imageTag,omitempty"`
	trackableSetter filtersutil.TrackableSetter
}

func (u imageTagUpdater) SetImageValue(rn *yaml.RNode) error {
	if err := yaml.ErrorIfInvalid(rn, yaml.ScalarNode); err != nil {
		return err
	}

	value := rn.YNode().Value

	if !image.IsImageMatched(value, u.ImageTag.Name) {
		return nil
	}

	name, tag := image.Split(value)
	if u.ImageTag.NewName != "" {
		name = u.ImageTag.NewName
	}
	if u.ImageTag.NewTag != "" {
		tag = ":" + u.ImageTag.NewTag
	}
	if u.ImageTag.Digest != "" {
		tag = "@" + u.ImageTag.Digest
	}

	return u.trackableSetter.SetScalar(name + tag)(rn)
}

func (u imageTagUpdater) Filter(rn *yaml.RNode) (*yaml.RNode, error) {
	if err := u.SetImageValue(rn); err != nil {
		return nil, err
	}
	return rn, nil
}
