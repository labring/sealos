// Copyright © 2023 sealos.
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

package buildah

import "errors"

const (
	// DocsPath ImageStdPath  ImageCRFile are path to image cr and readme
	DocsPath     = "README.md"
	ImageStdPath = "metadata"
	// ImageCRFile Todo how can we support both config.yml and config.yaml
	ImageCRFile = "config.yaml"

	// SealosRootPath and KubeConfigPath is path to user kubeconfig
	SealosRootPath = ".sealos"
	KubeConfigPath = "config"

	// ImagehubGroup ImagehubVersion ImagehubKind are group version kind of image cr
	ImagehubGroup    = "imagehub.sealos.io"
	ImagehubVersion  = "v1"
	ImagehubKind     = "Image"
	ImagehubResource = "images"
)

type CrOpionEnum string

const (
	CrOptionNo   CrOpionEnum = "no"
	CrOptionYes  CrOpionEnum = "yes"
	CrOptionOnly CrOpionEnum = "only"
	CrOptionAuto CrOpionEnum = "auto"
)

// String is used both by fmt.Print and by Cobra in help text
func (e *CrOpionEnum) String() string {
	return string(*e)
}

func (e *CrOpionEnum) Set(v string) error {
	switch v {
	case "only", "yes", "no", "auto":
		*e = CrOpionEnum(v)
		return nil
	default:
		return errors.New(`must be one of "only", "yes", "no", "auto"`)
	}
}

func (e *CrOpionEnum) Type() string {
	return "image cr opion enum"
}
