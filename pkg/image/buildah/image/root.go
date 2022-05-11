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
	"os"

	"github.com/containers/common/pkg/config"
	"github.com/containers/common/pkg/umask"
	is "github.com/containers/image/v5/storage"
	"github.com/containers/storage"
	"github.com/containers/storage/pkg/unshare"
	"github.com/labring/sealos/pkg/image/types"
	"github.com/pkg/errors"
	"github.com/sirupsen/logrus"
)

// ImageService is the default service, which is used for image pull/push
type ImageService struct {
	store               *storage.Store
	globalFlagResults   *types.GlobalBuildahFlags
	listImageOpts       *types.ImageResults
	inspectOpts         *types.InspectResults
	pullOpts            *types.PullOptions
	pushOpts            *types.PushOptions
	rmiOpts             *types.RmiOptions
	buildahBuildOptions *types.BuildahBuildOptions
}

func newGlobalOptions() *types.GlobalBuildahFlags {
	var (
		defaultStoreDriverOptions []string
	)
	storageOptions, err := storage.DefaultStoreOptions(false, 0)
	if err != nil {
		logrus.Errorf(err.Error())
		os.Exit(1)
	}
	if len(storageOptions.GraphDriverOptions) > 0 {
		optionSlice := storageOptions.GraphDriverOptions[:]
		defaultStoreDriverOptions = optionSlice
	}
	containerConfig, err := config.Default()
	if err != nil {
		logrus.Errorf(err.Error())
		os.Exit(1)
	}
	containerConfig.CheckCgroupsAndAdjustConfig()
	return &types.GlobalBuildahFlags{
		Debug:                      true,
		LogLevel:                   "warn",
		Root:                       storageOptions.GraphRoot,
		RunRoot:                    storageOptions.RunRoot,
		StorageDriver:              storageOptions.GraphDriverName,
		RegistriesConf:             "",
		RegistriesConfDir:          "",
		DefaultMountsFile:          "",
		StorageOpts:                defaultStoreDriverOptions,
		UserNSUID:                  []string{},
		UserNSGID:                  []string{},
		CPUProfile:                 "",
		MemoryProfile:              "",
		UserShortNameAliasConfPath: "",
		CgroupManager:              containerConfig.Engine.CgroupManager,
	}
}

func newListImageOptions() *types.ImageResults {
	return &types.ImageResults{
		ImageOptions: types.ImageOptions{
			All:       false,
			Digests:   false,
			Format:    "",
			JSON:      false,
			NoHeading: false,
			Truncate:  false,
			Quiet:     false,
			History:   false,
		},
		Filter: []string{},
		Names:  []string{},
	}
}

func newStore(globalFlagResults *types.GlobalBuildahFlags) (*storage.Store, error) {
	options, err := storage.DefaultStoreOptions(unshare.IsRootless(), unshare.GetRootlessUID())
	if err != nil {
		return nil, err
	}

	options.GraphRoot = globalFlagResults.Root
	options.RunRoot = globalFlagResults.RunRoot

	if err := setXDGRuntimeDir(); err != nil {
		return nil, err
	}

	options.GraphDriverName = globalFlagResults.StorageDriver
	// If any options setup in config, these should be dropped if user overrode the driver
	options.GraphDriverOptions = []string{}
	options.GraphDriverOptions = globalFlagResults.StorageOpts

	// Do not allow to mount a graphdriver that is not vfs if we are creating the userns as part
	// of the mount command.
	// Differently, allow the mount if we are already in a userns, as the mount point will still
	// be accessible once "buildah mount" exits.
	if os.Geteuid() != 0 && options.GraphDriverName != "vfs" {
		return nil, errors.Errorf("cannot mount using driver %s in rootless mode. You need to run it in a `buildah unshare` session", options.GraphDriverName)
	}

	if len(globalFlagResults.UserNSUID) > 0 {
		uopts := globalFlagResults.UserNSUID
		gopts := globalFlagResults.UserNSGID

		if len(gopts) == 0 {
			gopts = uopts
		}

		uidmap, gidmap, err := unshare.ParseIDMappings(uopts, gopts)
		if err != nil {
			return nil, err
		}
		options.UIDMap = uidmap
		options.GIDMap = gidmap
	} else {
		if len(globalFlagResults.UserNSGID) > 0 {
			return nil, errors.New("option --userns-gid-map can not be used without --userns-uid-map")
		}
	}

	// If a subcommand has the flags, check if they are set; if so, override the global values
	uopts := globalFlagResults.UserNSUID
	gopts := globalFlagResults.UserNSGID
	if len(gopts) == 0 {
		gopts = uopts
	}
	uidmap, gidmap, err := unshare.ParseIDMappings(uopts, gopts)
	if err != nil {
		return nil, err
	}
	options.UIDMap = uidmap
	options.GIDMap = gidmap
	umask.Check()
	store, err := storage.GetStore(options)
	if store != nil {
		is.Transport.SetStore(store)
	}
	return &store, err
}

func newRmiOptions() *types.RmiOptions {
	return &types.RmiOptions{
		Prune: false,
		All:   false,
		Force: false,
	}
}

func NewImageService() (types.Service, error) {
	globalFlagResults := newGlobalOptions()
	store, err := newStore(globalFlagResults)
	if err != nil {
		return nil, err
	}
	return &ImageService{
		store:               store,
		globalFlagResults:   globalFlagResults,
		listImageOpts:       newListImageOptions(),
		inspectOpts:         newInspectOpts(),
		pullOpts:            newPullOptions(),
		pushOpts:            newPushOptions(),
		rmiOpts:             newRmiOptions(),
		buildahBuildOptions: newBuildahBuildOptions(),
	}, nil
}
