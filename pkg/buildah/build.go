// Copyright © 2022 buildah.

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

package buildah

import (
	"fmt"
	"os"

	"github.com/containers/buildah/imagebuildah"
	buildahcli "github.com/containers/buildah/pkg/cli"
	"github.com/containers/buildah/pkg/parse"
	"github.com/containers/buildah/util"
	"github.com/spf13/cobra"

	"github.com/labring/sealos/pkg/utils/logger"
)

func newBuildCommand() *cobra.Command {
	buildDescription := `
  Builds an OCI image using instructions in one or more Containerfiles.

  If no arguments are specified, Buildah will use the current working directory
  as the build context and look for a Containerfile. The build fails if no
  Containerfile nor Dockerfile is present.`

	layerFlagsResults := buildahcli.LayerResults{}
	buildFlagResults := buildahcli.BudResults{}
	fromAndBudResults := buildahcli.FromAndBudResults{}
	userNSResults := buildahcli.UserNSResults{}
	namespaceResults := buildahcli.NameSpaceResults{}
	sopts := saveOptions{}

	buildCommand := &cobra.Command{
		Use:     "build [CONTEXT]",
		Aliases: []string{"build-using-dockerfile", "bud"},
		Short:   "Build an image using instructions in a Containerfile or Kubefile",
		Long:    buildDescription,
		RunE: func(cmd *cobra.Command, args []string) error {
			br := buildahcli.BuildOptions{
				LayerResults:      &layerFlagsResults,
				BudResults:        &buildFlagResults,
				UserNSResults:     &userNSResults,
				FromAndBudResults: &fromAndBudResults,
				NameSpaceResults:  &namespaceResults,
			}
			return buildCmd(cmd, args, sopts, br)
		},
		Args: cobra.MaximumNArgs(1),
		Example: fmt.Sprintf(`%[1]s build
  %[1]s bud -f Kubefile.simple .
  %[1]s bud -f Kubefile.simple -f Kubefile.notsosimple .`, rootCmd.Name()),
	}
	buildCommand.SetUsageTemplate(UsageTemplate())

	flags := buildCommand.Flags()
	flags.SetInterspersed(false)

	// build is a all common flags
	buildFlags := buildahcli.GetBudFlags(&buildFlagResults)
	buildFlags.StringVar(&buildFlagResults.Runtime, "runtime", util.Runtime(), "`path` to an alternate runtime. Use BUILDAH_RUNTIME environment variable to override.")

	layerFlags := buildahcli.GetLayerFlags(&layerFlagsResults)
	fromAndBudFlags, err := buildahcli.GetFromAndBudFlags(&fromAndBudResults, &userNSResults, &namespaceResults)
	bailOnError(err, "failed to setup From and Build flags")

	// set as default, otherwise parse.PlatformsFromOptions will get empty list
	err = fromAndBudFlags.Set("platform", parse.DefaultPlatform())
	bailOnError(err, "failed to set default platform flag")

	sopts.RegisterFlags(flags)
	flags.AddFlagSet(&buildFlags)
	flags.AddFlagSet(&layerFlags)
	flags.AddFlagSet(&fromAndBudFlags)
	flags.SetNormalizeFunc(buildahcli.AliasFlags)

	return buildCommand
}

func buildCmd(c *cobra.Command, inputArgs []string, sopts saveOptions, iopts buildahcli.BuildOptions) error {
	if flagChanged(c, "logfile") {
		logfile, err := os.OpenFile(iopts.Logfile, os.O_CREATE|os.O_TRUNC|os.O_WRONLY, 0600)
		if err != nil {
			return err
		}
		iopts.Logwriter = logfile
		defer iopts.Logwriter.Close()
	}

	options, containerfiles, removeAll, err := buildahcli.GenBuildOptions(c, inputArgs, iopts)
	if err != nil {
		return err
	}
	defer func() {
		for _, f := range removeAll {
			os.RemoveAll(f)
		}
	}()

	platforms, err := parsePlatforms(c)
	if err != nil {
		return err
	}
	if err = runSaveImages(options.ContextDirectory, platforms, &sopts); err != nil {
		return err
	}
	if globalFlagResults.DefaultMountsFile != "" {
		options.DefaultMountsFilePath = globalFlagResults.DefaultMountsFile
	}

	store, err := getStore(c)
	if err != nil {
		return err
	}

	id, ref, err := imagebuildah.BuildDockerfiles(getContext(), store, options, containerfiles...)
	if err == nil && options.Manifest != "" {
		logger.Debug("manifest list id = %q, ref = %q", id, ref.String())
	}
	return err
}
