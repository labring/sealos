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
	"context"
	"fmt"

	"github.com/containers/common/libimage"
	image_types "github.com/containers/image/v5/types"
	"github.com/hashicorp/go-multierror"
)

func (d *ImageService) Rmi(prune, force bool, names []string) error {
	store := *d.store
	systemContext := &image_types.SystemContext{}
	runtime, err := libimage.RuntimeFromStore(store, &libimage.RuntimeOptions{SystemContext: systemContext})
	if err != nil {
		return err
	}
	options := &libimage.RemoveImagesOptions{
		Filters: []string{"readonly=false"},
	}
	iopts := d.rmiOpts
	if prune {
		options.Filters = append(options.Filters, "dangling=true")
	} else if !iopts.All {
		options.Filters = append(options.Filters, "intermediate=false")
	}
	options.Force = force

	rmiReports, rmiErrors := runtime.RemoveImages(context.Background(), names, options)
	for _, r := range rmiReports {
		for _, u := range r.Untagged {
			fmt.Printf("untagged: %s\n", u)
		}
	}
	for _, r := range rmiReports {
		if r.Removed {
			fmt.Printf("%s\n", r.ID)
		}
	}

	var multiE *multierror.Error
	multiE = multierror.Append(multiE, rmiErrors...)
	return multiE.ErrorOrNil()
}

func (d *ImageService) Prune() error {
	return d.Rmi(true, d.rmiOpts.Force, []string{})
}
