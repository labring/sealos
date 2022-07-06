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
	"io"
	"io/ioutil"
	"os"
	"strings"

	"github.com/containers/buildah"
	"github.com/containers/buildah/define"
	buildahcli "github.com/containers/buildah/pkg/cli"
	"github.com/containers/buildah/pkg/parse"
	"github.com/containers/common/pkg/auth"
	"github.com/containers/common/pkg/config"
	"github.com/pkg/errors"
	"github.com/sirupsen/logrus"
)

type fromReply struct {
	authfile        string
	certDir         string
	cidfile         string
	creds           string
	format          string
	name            string
	pull            string
	pullAlways      bool
	pullNever       bool
	quiet           bool
	signaturePolicy string
	tlsVerify       bool
	*buildahcli.FromAndBudResults
	*buildahcli.UserNSResults
	*buildahcli.NameSpaceResults
}

var suffix string

func From(containerName, imageName string) error {
	defaultContainerConfig, err := config.Default()
	if err != nil {
		return errors.Wrapf(err, "failed to get container config")
	}

	var iopts fromReply

	fromAndBudResults := buildahcli.FromAndBudResults{}
	userNSResults := buildahcli.UserNSResults{}
	namespaceResults := buildahcli.NameSpaceResults{}

	iopts.FromAndBudResults = &fromAndBudResults
	iopts.UserNSResults = &userNSResults
	iopts.NameSpaceResults = &namespaceResults

	iopts.authfile = auth.GetDefaultAuthFile()
	iopts.certDir = ""
	iopts.cidfile = ""
	iopts.creds = ""
	iopts.format = defaultFormat()
	iopts.name = containerName
	iopts.pull = "never" //pull the image from the registry if newer or not present in store, if false, only pull the image if not present, if always, pull the image even if the named image is present in store, if never, only use the image present in store if available"
	iopts.pullAlways = false
	iopts.pullNever = true // default --pull never
	iopts.quiet = false
	iopts.signaturePolicy = ""
	suffix = ""
	iopts.tlsVerify = false
	fromAndBudFlags, err := buildahcli.GetFromAndBudFlags(&fromAndBudResults, &userNSResults, &namespaceResults)
	if err != nil {
		return err
	}

	if err := auth.CheckAuthFile(iopts.authfile); err != nil {
		return err
	}
	systemContext, err := getSystemContext(iopts.tlsVerify)
	if err != nil {
		return errors.Wrapf(err, "error building system context")
	}

	//platforms, err := parse.PlatformsFromOptions(c)
	//if err != nil {
	//	return err
	//}
	//if len(platforms) > 1 {
	//	logrus.Warnf("ignoring platforms other than %+v: %+v", platforms[0], platforms[1:])
	//}

	// Allow for --pull, --pull=true, --pull=false, --pull=never, --pull=always
	// --pull-always and --pull-never.  The --pull-never and --pull-always options
	// will not be documented.
	// in sealos default --pull=never
	pullPolicy := define.PullIfMissing
	if strings.EqualFold(strings.TrimSpace(iopts.pull), "true") {
		pullPolicy = define.PullIfNewer
	}
	if iopts.pullAlways || strings.EqualFold(strings.TrimSpace(iopts.pull), "always") {
		pullPolicy = define.PullAlways
	}
	if iopts.pullNever || strings.EqualFold(strings.TrimSpace(iopts.pull), "never") {
		pullPolicy = define.PullNever
	}
	logrus.Debugf("Pull Policy for pull [%v]", pullPolicy)

	signaturePolicy := iopts.signaturePolicy

	globalFlagResults := newGlobalOptions()
	store, err := getStore(globalFlagResults)
	if err != nil {
		return errors.Wrapf(err, "get store")
	}

	commonOpts, err := CommonBuildOptionsFromFlagSet(&fromAndBudFlags)
	//commonOpts, err := parse.CommonBuildOptions(c)
	if err != nil {
		return errors.Wrapf(err, "get CommonBuildOptionsFromFlagSet")
	}

	isolation, err := parse.IsolationOption(iopts.FromAndBudResults.Isolation)
	if err != nil {
		return errors.Wrapf(err, "IsolationOption")
	}

	namespaceOptions, networkPolicy, err := NamespaceOptions(&fromAndBudFlags)
	if err != nil {
		return errors.Wrapf(err, "error parsing namespace-related options")
	}
	usernsOption, idmappingOptions, err := IDMappingOptions(&fromAndBudFlags, getGlobalOptionsFlag())
	if err != nil {
		return errors.Wrapf(err, "error parsing ID mapping options")
	}
	namespaceOptions.AddOrReplace(usernsOption...)

	format, err := getFormat(iopts.format)
	if err != nil {
		return err
	}
	devices := define.ContainerDevices{}
	for _, device := range append(defaultContainerConfig.Containers.Devices, iopts.FromAndBudResults.Devices...) {
		dev, err := parse.DeviceFromPath(device)
		if err != nil {
			return err
		}
		devices = append(devices, dev...)
	}

	capabilities, err := defaultContainerConfig.Capabilities("", iopts.FromAndBudResults.CapAdd, iopts.FromAndBudResults.CapDrop)
	if err != nil {
		return err
	}

	commonOpts.Ulimit = append(defaultContainerConfig.Containers.DefaultUlimits, commonOpts.Ulimit...)

	decConfig, err := getDecryptConfig(iopts.FromAndBudResults.DecryptionKeys)
	if err != nil {
		return errors.Wrapf(err, "unable to obtain decrypt config")
	}

	options := buildah.BuilderOptions{
		FromImage:             imageName,
		Container:             iopts.name,
		ContainerSuffix:       suffix,
		PullPolicy:            pullPolicy,
		SignaturePolicyPath:   signaturePolicy,
		SystemContext:         systemContext,
		DefaultMountsFilePath: globalFlagResults.DefaultMountsFile,
		Isolation:             isolation,
		NamespaceOptions:      namespaceOptions,
		ConfigureNetwork:      networkPolicy,
		CNIPluginPath:         iopts.NameSpaceResults.CNIPlugInPath,
		CNIConfigDir:          iopts.NameSpaceResults.CNIConfigDir,
		IDMappingOptions:      idmappingOptions,
		Capabilities:          capabilities,
		CommonBuildOpts:       commonOpts,
		Format:                format,
		BlobDirectory:         iopts.FromAndBudResults.BlobCache,
		Devices:               devices,
		MaxPullRetries:        maxPullPushRetries,
		PullRetryDelay:        pullPushRetryDelay,
		OciDecryptConfig:      decConfig,
	}

	if !iopts.quiet {
		options.ReportWriter = os.Stderr
	}

	builder, err := buildah.NewBuilder(getContext(), store, options)
	if err != nil {
		return err
	}

	if err := onBuild(builder, iopts.quiet); err != nil {
		return err
	}

	if iopts.cidfile != "" {
		filePath := iopts.cidfile
		if err := ioutil.WriteFile(filePath, []byte(builder.ContainerID), 0644); err != nil {
			return errors.Wrapf(err, "filed to write Container ID File %q", filePath)
		}
	}
	fmt.Printf("%s\n", builder.Container)
	return builder.Save()
}

func onBuild(builder *buildah.Builder, quiet bool) error {
	ctr := 0
	for _, onBuildSpec := range builder.OnBuild() {
		ctr = ctr + 1
		commands := strings.Split(onBuildSpec, " ")
		command := strings.ToUpper(commands[0])
		args := commands[1:]
		if !quiet {
			fmt.Fprintf(os.Stderr, "STEP %d: %s\n", ctr, onBuildSpec)
		}
		switch command {
		case "ADD":
		case "COPY":
			dest := ""
			size := len(args)
			if size > 1 {
				dest = args[size-1]
				args = args[:size-1]
			}
			if err := builder.Add(dest, command == "ADD", buildah.AddAndCopyOptions{}, args...); err != nil {
				return err
			}
		case "ANNOTATION":
			annotation := strings.SplitN(args[0], "=", 2)
			if len(annotation) > 1 {
				builder.SetAnnotation(annotation[0], annotation[1])
			} else {
				builder.UnsetAnnotation(annotation[0])
			}
		case "CMD":
			builder.SetCmd(args)
		case "ENV":
			env := strings.SplitN(args[0], "=", 2)
			if len(env) > 1 {
				builder.SetEnv(env[0], env[1])
			} else {
				builder.UnsetEnv(env[0])
			}
		case "ENTRYPOINT":
			builder.SetEntrypoint(args)
		case "EXPOSE":
			builder.SetPort(strings.Join(args, " "))
		case "HOSTNAME":
			builder.SetHostname(strings.Join(args, " "))
		case "LABEL":
			label := strings.SplitN(args[0], "=", 2)
			if len(label) > 1 {
				builder.SetLabel(label[0], label[1])
			} else {
				builder.UnsetLabel(label[0])
			}
		case "MAINTAINER":
			builder.SetMaintainer(strings.Join(args, " "))
		case "ONBUILD":
			builder.SetOnBuild(strings.Join(args, " "))
		case "RUN":
			var stdout io.Writer
			if quiet {
				stdout = ioutil.Discard
			}
			if err := builder.Run(args, buildah.RunOptions{Stdout: stdout}); err != nil {
				return err
			}
		case "SHELL":
			builder.SetShell(args)
		case "STOPSIGNAL":
			builder.SetStopSignal(strings.Join(args, " "))
		case "USER":
			builder.SetUser(strings.Join(args, " "))
		case "VOLUME":
			builder.AddVolume(strings.Join(args, " "))
		case "WORKINGDIR":
			builder.SetWorkDir(strings.Join(args, " "))
		default:
			logrus.Errorf("unknown OnBuild command %q; ignored", onBuildSpec)
		}
	}
	builder.ClearOnBuild()
	return nil
}
