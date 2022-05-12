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
	"context"

	"github.com/containers/buildah/define"
	"github.com/containers/buildah/imagebuildah"
	buildahcli "github.com/containers/buildah/pkg/cli"
	"github.com/containers/buildah/pkg/parse"
	buildahutil "github.com/containers/buildah/pkg/util"

	"io"
	"io/ioutil"
	"path/filepath"
	"time"

	image_types "github.com/containers/image/v5/types"
	"github.com/sirupsen/logrus"

	"os"
	"path"
	"strings"

	"github.com/containers/common/pkg/auth"
	"github.com/labring/sealos/pkg/buildimage"
	"github.com/labring/sealos/pkg/image/types"
	"github.com/labring/sealos/pkg/registry"
	"github.com/labring/sealos/pkg/utils/contants"
	"github.com/labring/sealos/pkg/utils/logger"
	v1 "github.com/opencontainers/image-spec/specs-go/v1"
	"github.com/pkg/errors"
)

func (d *ImageService) Build(options *types.BuildOptions, contextDir, imageName string) error {
	//contants.ImageShimDirName
	imageFetchDir := path.Join(contextDir, contants.ManifestsDirName)
	yamlImages, err := buildimage.ParseYamlImages(imageFetchDir)
	logger.Info("fetch manifests images: %v", yamlImages)
	if err != nil {
		return errors.Wrap(err, "get images list failed in this context")
	}
	imageListDir := path.Join(contextDir, contants.ImagesDirName, contants.ImageShimDirName)
	images, err := buildimage.LoadImages(imageListDir)
	if err != nil {
		return errors.Wrap(err, "load images list failed in this context")
	}
	images = append(images, yamlImages...)
	auths, err := registry.GetAuthInfo()
	if err != nil {
		return err
	}
	is := registry.NewImageSaver(context.Background(), auths)
	platform := strings.Split(options.Platform, "/")
	var platformVar v1.Platform
	if len(platform) > 2 {
		platformVar = v1.Platform{
			Architecture: platform[1],
			OS:           platform[0],
			Variant:      platform[2],
		}
	} else {
		platformVar = v1.Platform{
			Architecture: platform[1],
			OS:           platform[0],
		}
	}
	logger.Info("pull images %v for platform is %s", images, strings.Join([]string{platformVar.OS, platformVar.Architecture}, "/"))

	images, err = is.SaveImages(images, path.Join(contextDir, contants.RegistryDirName), platformVar)
	if err != nil {
		return errors.Wrap(err, "save images failed in this context")
	}
	logger.Info("output images %v for platform is %s", images, strings.Join([]string{platformVar.OS, platformVar.Architecture}, "/"))
	options.Tag = imageName
	//fmt.Sprintf("buildah build %s %s", options.String(), contextDir)
	cliArgs := strings.Split(options.String(), " ")
	// start call buildah build
	output := ""
	cleanTmpFile := false
	var tags []string
	tags = append(tags, options.Tag)

	if err = auth.CheckAuthFile(d.buildahBuildOptions.BudResults.Authfile); err != nil {
		return err
	}
	iopts := d.buildahBuildOptions
	d.buildahBuildOptions.BudResults.Authfile, cleanTmpFile = buildahutil.MirrorToTempFileIfPathIsDescriptor(iopts.BudResults.Authfile)
	if cleanTmpFile {
		defer os.Remove(d.buildahBuildOptions.BudResults.Authfile)
	}
	// Allow for --pull, --pull=true, --pull=false, --pull=never, --pull=always
	// --pull-always and --pull-never.  The --pull-never and --pull-always options
	// will not be documented.
	pullPolicy := define.PullIfMissing
	if strings.EqualFold(strings.TrimSpace(iopts.Pull), "true") {
		pullPolicy = define.PullIfNewer
	}
	if iopts.PullAlways || strings.EqualFold(strings.TrimSpace(iopts.Pull), "always") {
		pullPolicy = define.PullAlways
	}
	if iopts.PullNever || strings.EqualFold(strings.TrimSpace(iopts.Pull), "never") {
		pullPolicy = define.PullNever
	}
	logrus.Debugf("Pull Policy for pull [%v]", pullPolicy)

	args := make(map[string]string)
	for _, arg := range iopts.BuildArg {
		av := strings.SplitN(arg, "=", 2)
		if len(av) > 1 {
			args[av[0]] = av[1]
		} else {
			// check if the env is set in the local environment and use that value if it is
			if val, present := os.LookupEnv(av[0]); present {
				args[av[0]] = val
			} else {
				delete(args, av[0])
			}
		}
	}
	containerfiles := getContainerfiles(iopts.File)
	format, err := getFormat(iopts.Format)
	if err != nil {
		return err
	}
	layers := buildahcli.UseLayers()
	// Nothing provided, we assume the current working directory as build
	// context
	if len(cliArgs) == 0 {
		contextDir, err = os.Getwd()
		if err != nil {
			return errors.Wrapf(err, "unable to choose current working directory as build context")
		}
	} else {
		// The context directory could be a URL.  Try to handle that.
		tempDir, subDir, err := define.TempDirForURL("", "buildah", cliArgs[0])
		if err != nil {
			return errors.Wrapf(err, "error prepping temporary context directory")
		}
		if tempDir != "" {
			// We had to download it to a temporary directory.
			// Delete it later.
			defer func() {
				if err = os.RemoveAll(tempDir); err != nil {
					logrus.Errorf("error removing temporary directory: %v", err)
				}
			}()
			contextDir = filepath.Join(tempDir, subDir)
		} else {
			// Nope, it was local.  Use it as is.
			absDir, err := filepath.Abs(cliArgs[0])
			if err != nil {
				return errors.Wrapf(err, "error determining path to directory")
			}
			contextDir = absDir
		}
	}

	if len(containerfiles) == 0 {
		// Try to find the Containerfile/Dockerfile within the contextDir
		containerfile, err := buildahutil.DiscoverContainerfile(contextDir)
		if err != nil {
			return err
		}
		containerfiles = append(containerfiles, containerfile)
		contextDir = filepath.Dir(containerfile)
	}

	contextDir, err = filepath.EvalSymlinks(contextDir)
	if err != nil {
		return errors.Wrapf(err, "error evaluating symlinks in build context path")
	}

	var stdin io.Reader
	if iopts.Stdin {
		stdin = os.Stdin
	}
	var stdout, stderr, reporter *os.File
	stdout = os.Stdout
	stderr = os.Stderr
	reporter = os.Stderr

	store := *d.store
	systemContext := &image_types.SystemContext{}

	isolation, err := parse.IsolationOption(iopts.Isolation)
	if err != nil {
		return err
	}
	runtimeFlags := []string{}
	for _, arg := range iopts.RuntimeFlags {
		runtimeFlags = append(runtimeFlags, "--"+arg)
	}

	if err != nil {
		return err
	}

	compression := define.Gzip
	if iopts.DisableCompression {
		compression = define.Uncompressed
	}
	buildOption, err := parse.GetBuildOutput(iopts.BuildOutput)
	if err != nil {
		return err
	}
	if buildOption.IsStdout {
		iopts.Quiet = true
	}

	var timestamp *time.Time
	t := time.Now().UTC()
	timestamp = &t
	var platforms []struct{ OS, Arch, Variant string }
	platforms = append(platforms, struct{ OS, Arch, Variant string }{platformVar.OS, platformVar.Architecture, platformVar.Variant})
	buildahOptions := define.BuildOptions{
		AddCapabilities:         iopts.CapAdd,
		AdditionalTags:          tags,
		AllPlatforms:            iopts.AllPlatforms,
		Annotations:             iopts.Annotation,
		Architecture:            systemContext.ArchitectureChoice,
		Args:                    args,
		BlobDirectory:           iopts.BlobCache,
		CNIConfigDir:            iopts.CNIConfigDir,
		CNIPluginPath:           iopts.CNIPlugInPath,
		Compression:             compression,
		ContextDirectory:        contextDir,
		DefaultMountsFilePath:   d.globalFlagResults.DefaultMountsFile,
		Devices:                 iopts.Devices,
		DropCapabilities:        iopts.CapDrop,
		Err:                     stderr,
		ForceRmIntermediateCtrs: iopts.ForceRm,
		From:                    iopts.From,
		IIDFile:                 iopts.Iidfile,
		In:                      stdin,
		Isolation:               isolation,
		IgnoreFile:              iopts.IgnoreFile,
		Labels:                  iopts.Label,
		Layers:                  layers,
		LogRusage:               iopts.LogRusage,
		Manifest:                iopts.Manifest,
		MaxPullPushRetries:      maxPullPushRetries,
		NoCache:                 iopts.NoCache,
		OS:                      systemContext.OSChoice,
		Out:                     stdout,
		Output:                  output,
		BuildOutput:             iopts.BuildOutput,
		OutputFormat:            format,
		PullPolicy:              pullPolicy,
		PullPushRetryDelay:      pullPushRetryDelay,
		Quiet:                   iopts.Quiet,
		RemoveIntermediateCtrs:  iopts.Rm,
		ReportWriter:            reporter,
		Runtime:                 iopts.Runtime,
		RuntimeArgs:             runtimeFlags,
		RusageLogFile:           iopts.RusageLogFile,
		SignBy:                  iopts.SignBy,
		SignaturePolicyPath:     iopts.SignaturePolicy,
		Squash:                  iopts.Squash,
		SystemContext:           systemContext,
		Target:                  iopts.Target,
		TransientMounts:         iopts.Volumes,
		Jobs:                    &iopts.Jobs,
		Timestamp:               timestamp,
		Platforms:               platforms,
		UnsetEnvs:               iopts.UnsetEnvs,
		Envs:                    iopts.Envs,
		OSFeatures:              iopts.OSFeatures,
		OSVersion:               iopts.OSVersion,
	}
	if iopts.Quiet {
		buildahOptions.ReportWriter = ioutil.Discard
	}

	id, ref, err := imagebuildah.BuildDockerfiles(getContext(), store, buildahOptions, containerfiles...)
	if err == nil && buildahOptions.Manifest != "" {
		logrus.Debugf("manifest list id = %q, ref = %q", id, ref.String())
	}
	return err
}

func getContainerfiles(files []string) []string {
	var containerfiles []string
	for _, f := range files {
		if f == "-" {
			containerfiles = append(containerfiles, "/dev/stdin")
		} else {
			containerfiles = append(containerfiles, f)
		}
	}
	return containerfiles
}

func newBuildahBuildOptions() *types.BuildahBuildOptions {
	layerFlagsResults := buildahcli.LayerResults{}
	buildFlagResults := buildahcli.BudResults{}
	buildFlagResults.Format = define.OCI

	fromAndBudResults := buildahcli.FromAndBudResults{}
	userNSResults := buildahcli.UserNSResults{}
	namespaceResults := buildahcli.NameSpaceResults{}
	return &types.BuildahBuildOptions{
		LayerResults:      &layerFlagsResults,
		BudResults:        &buildFlagResults,
		UserNSResults:     &userNSResults,
		FromAndBudResults: &fromAndBudResults,
		NameSpaceResults:  &namespaceResults,
	}
}
