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

import (
	"errors"
	"fmt"
	"path/filepath"

	"github.com/containers/image/v5/pkg/docker/config"
	"github.com/spf13/cobra"
	"k8s.io/client-go/util/homedir"

	imagev1 "github.com/labring/sealos/controllers/imagehub/api/v1"
	"github.com/labring/sealos/pkg/utils/file"
	"github.com/labring/sealos/pkg/utils/logger"
)

// SpecificCroption is used to parse the cr-option `auto` to `yes` or `no`.
func SpecificCroption(args []string) CrOpionEnum {
	var dest, username string
	switch len(args) {
	case 1:
		dest = args[0]
	case 2:
		dest = args[1]
	}
	registry, err := parseRawURL(dest)
	if err != nil {
		logger.Debug("parse image url failed, skip image cr build")
		return CrOptionNo
	}
	creds, err := config.GetAllCredentials(nil)
	if err != nil {
		logger.Debug("get all credentials failed, skip image cr build")
		return CrOptionNo
	}
	if _, ok := creds[registry]; ok {
		username = creds[registry].Username
	} else {
		logger.Debug("no credentials for this registry, skip image cr build")
		return CrOptionNo
	}
	if !file.IsExist(filepath.Join(homedir.HomeDir(), SealosRootPath, registry)) ||
		!file.IsExist(filepath.Join(homedir.HomeDir(), SealosRootPath, registry, username)) {
		logger.Debug("no kubeconfig file for this registry, skip image cr build")
		return CrOptionNo
	}
	return CrOptionYes
}

func NewImageCRBuilderFromArgs(cmd *cobra.Command, args []string) (*ImageCRBuilder, error) {
	var dest string
	switch len(args) {
	case 1:
		dest = args[0]
	case 2:
		dest = args[1]
	default:
		return nil, errors.New("dest image name must be specified")
	}
	store, err := getStore(cmd)
	if err != nil {
		return nil, err
	}
	registr, err := parseRawURL(dest)
	if err != nil {
		return nil, err
	}
	icb := &ImageCRBuilder{
		image:    dest,
		store:    store,
		registry: registr,
		imageCR:  &imagev1.Image{},
	}
	return icb, nil
}

func NewAndRunImageCRBuilder(cmd *cobra.Command, args []string, iopts *pushOptions) error {
	if iopts.crOption == CrOptionNo {
		logger.Debug("skip image cr build by flag cr-option")
		return nil
	}
	logger.Info("start image cr build and push")
	icb, err := NewImageCRBuilderFromArgs(cmd, args)
	if err != nil {
		logger.Debug("new image cr builder failed, skip image cr build")
		return err
	}
	// check if sealos registry, pahse registry info to ibc.
	if !IsSealosRegistry(icb) {
		logger.Debug("skip image cr build, not sealos registry")
		return nil
	}
	if err := icb.Run(); err != nil {
		logger.Error(err)
		return err
	}
	logger.Info("image cr build and push success")
	return nil
}

func IsSealosRegistry(icb *ImageCRBuilder) bool {
	//Check Cri Login
	creds, err := config.GetAllCredentials(nil)
	if err != nil {
		logger.Debug("get credentials err ,please login first ." + fmt.Sprintf("%v", err))
		return false
	}
	if _, ok := creds[icb.registry]; ok {
		icb.username = creds[icb.registry].Username
		icb.userconfig = creds[icb.registry].Password
	} else {
		logger.Debug("get registry login info err, please login " + icb.registry + " first")
		return false
	}
	if !file.IsExist(filepath.Join(homedir.HomeDir(), SealosRootPath, icb.registry)) ||
		!file.IsExist(filepath.Join(homedir.HomeDir(), SealosRootPath, icb.registry, icb.username)) {
		logger.Debug("no kubeconfig file for this registry, skip image cr build")
		return false
	}
	return true
}
