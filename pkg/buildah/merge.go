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

package buildah

import (
	"fmt"
	"os"
	"path"
	"strings"

	"github.com/containers/buildah"
	buildahcli "github.com/containers/buildah/pkg/cli"
	"github.com/containers/buildah/util"
	v1 "github.com/opencontainers/image-spec/specs-go/v1"
	"github.com/spf13/cobra"

	"github.com/labring/sealos/pkg/buildimage"

	"github.com/labring/sealos/pkg/utils/logger"
	"github.com/labring/sealos/pkg/utils/rand"
)

func newMergeCommand() *cobra.Command {
	layerFlagsResults := buildahcli.LayerResults{}
	buildFlagResults := buildahcli.BudResults{}
	fromAndBudResults := buildahcli.FromAndBudResults{}
	userNSResults := buildahcli.UserNSResults{}
	namespaceResults := buildahcli.NameSpaceResults{}
	buildahInfo := &buildah.BuilderInfo{}
	sopts := saveOptions{}
	mergeCommand := &cobra.Command{
		Use:   "merge",
		Short: "merge multiple images into one",
		RunE: func(cmd *cobra.Command, args []string) error {
			br := buildahcli.BuildOptions{
				LayerResults:      &layerFlagsResults,
				BudResults:        &buildFlagResults,
				UserNSResults:     &userNSResults,
				FromAndBudResults: &fromAndBudResults,
				NameSpaceResults:  &namespaceResults,
			}
			logger.Debug("save enable: %+v", sopts.enabled)
			return buildCmd(cmd, []string{buildahInfo.MountPoint}, sopts, br)
		},
		PreRunE: func(cmd *cobra.Command, args []string) error {
			arch := getArchFromFlag(cmd)
			oss := getOSFromFlag(cmd)
			variant := getVariantFromFlags(cmd)
			tag := getTagsFromFlags(cmd)
			logger.Debug("os: %s, arch: %s, variant: %s, tag: %+v", oss, arch, variant, tag)

			platform := v1.Platform{
				Architecture: arch,
				OS:           oss,
				Variant:      variant,
			}
			var err error
			buildahInfo, err = mergeImagesWithScratchContainer(tag[0], args, platform)
			if err != nil {
				return err
			}
			return setDefaultFlagIfNotChanged(cmd, "save-image", "false")
		},
		PostRunE: func(cmd *cobra.Command, args []string) error {
			tag := getTagsFromFlags(cmd)
			logger.Debug("images %s is merged to %+v", strings.Join(args, ","), tag)
			if buildahInfo != nil {
				b, err := New("")
				if err != nil {
					return err
				}
				if err = b.Delete(buildahInfo.Container); err != nil {
					return err
				}
			}
			return nil
		},
		Args: cobra.MinimumNArgs(2),
		Example: fmt.Sprintf(`
  %[1]s merge kubernetes:v1.19.9 mysql:5.7.0 redis:6.0.0 -t new:0.1.0`, rootCmd.CommandPath()),
	}
	mergeCommand.SetUsageTemplate(UsageTemplate())

	flags := mergeCommand.Flags()
	flags.SetInterspersed(false)

	// build is a all common flags
	buildFlags := buildahcli.GetBudFlags(&buildFlagResults)
	buildFlags.StringVar(&buildFlagResults.Runtime, "runtime", util.Runtime(), "`path` to an alternate runtime. Use BUILDAH_RUNTIME environment variable to override.")
	layerFlags := buildahcli.GetLayerFlags(&layerFlagsResults)
	fromAndBudFlags, err := buildahcli.GetFromAndBudFlags(&fromAndBudResults, &userNSResults, &namespaceResults)
	bailOnError(err, "failed to setup From and Build flags")

	sopts.RegisterFlags(flags)
	flags.AddFlagSet(&buildFlags)
	flags.AddFlagSet(&layerFlags)
	flags.AddFlagSet(&fromAndBudFlags)
	flags.SetNormalizeFunc(buildahcli.AliasFlags)
	bailOnError(markFlagsHidden(flags, "save-image"), "")
	bailOnError(markFlagsHidden(flags, "tls-verify"), "")
	return mergeCommand
}

func mergeImagesWithScratchContainer(newImageName string, images []string, platform v1.Platform) (*buildah.BuilderInfo, error) {
	b, err := New("")
	if err != nil {
		return nil, err
	}
	cName := fmt.Sprintf("%s-%s", newImageName, rand.Generator(8))
	bInfo, err := b.Create(cName, "scratch", WithPlatformOption(platform))
	if err != nil {
		return nil, err
	}
	logger.Debug("mergeDir: %s", bInfo.MountPoint)
	if err = b.Pull(images, WithPlatformOption(platform), WithPullPolicyOption(PullIfMissing.String())); err != nil {
		return nil, err
	}

	imageObjList := make([]map[string]v1.Image, 0)
	for _, i := range images {
		obj, _ := b.InspectImage(i)
		if obj != nil {
			imageObjList = append(imageObjList, map[string]v1.Image{i: *obj.OCIv1})
		}
	}

	dockerfile, err := buildimage.MergeDockerfileFromImages(imageObjList)
	if err != nil {
		return nil, err
	}
	mergeDir := bInfo.MountPoint
	err = os.WriteFile(path.Join(mergeDir, "Sealfile"), []byte(dockerfile), 0755)
	if err != nil {
		return nil, err
	}
	logger.Debug("buildOptions file: %s", path.Join(mergeDir, "Sealfile"))
	logger.Debug("buildOptions tag: %s", newImageName)
	logger.Debug("buildOptions contextDir: %s", mergeDir)
	return &bInfo, nil
}
