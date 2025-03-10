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
	"errors"
	"fmt"
	"io"
	"os"
	"strings"
	"time"

	"github.com/containers/buildah"
	"github.com/containers/buildah/define"
	buildahcli "github.com/containers/buildah/pkg/cli"
	"github.com/containers/buildah/pkg/parse"
	"github.com/containers/common/pkg/auth"
	"github.com/containers/common/pkg/config"
	"github.com/containers/image/v5/types"
	"github.com/containers/storage"
	"github.com/spf13/cobra"
	"github.com/spf13/pflag"

	"github.com/labring/sealos/pkg/buildah/internal/util"
	"github.com/labring/sealos/pkg/utils/logger"
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

func newDefaultFromReply() *fromReply {
	defaultContainerConfig, err := config.Default()
	if err != nil {
		logger.Fatal(err)
	}
	return &fromReply{
		authfile:  auth.GetDefaultAuthFile(),
		format:    defaultFormat(),
		pull:      "true",
		tlsVerify: false,
		FromAndBudResults: &buildahcli.FromAndBudResults{
			Devices:    defaultContainerConfig.Containers.Devices,
			DNSSearch:  defaultContainerConfig.Containers.DNSSearches,
			DNSServers: defaultContainerConfig.Containers.DNSServers,
			DNSOptions: defaultContainerConfig.Containers.DNSOptions,
			HTTPProxy:  true,
			Isolation:  buildahcli.DefaultIsolation(),
			Retry:      buildahcli.MaxPullPushRetries,
			RetryDelay: buildahcli.PullPushRetryDelay.String(),
			ShmSize:    defaultContainerConfig.Containers.ShmSize,
			Ulimit:     defaultContainerConfig.Containers.DefaultUlimits,
			Volumes:    defaultContainerConfig.Containers.Volumes,
		},
		UserNSResults:    &buildahcli.UserNSResults{},
		NameSpaceResults: &buildahcli.NameSpaceResults{},
	}
}

func (opts *fromReply) RegisterFlags(fs *pflag.FlagSet) {
	fs.SetInterspersed(false)
	fs.StringVar(&opts.authfile, "authfile", opts.authfile, "path of the authentication file. Use REGISTRY_AUTH_FILE environment variable to override")
	fs.StringVar(&opts.certDir, "cert-dir", opts.certDir, "use certificates at the specified path to access the registry")
	fs.StringVar(&opts.cidfile, "cidfile", opts.cidfile, "write the container ID to the file")
	fs.StringVar(&opts.creds, "creds", opts.creds, "use `[username[:password]]` for accessing the registry")
	fs.StringVarP(&opts.format, "format", "f", opts.format, "`format` of the image manifest and metadata")
	fs.StringVar(&opts.name, "name", opts.name, "`name` for the working container")
	fs.StringVar(&opts.pull, "pull", opts.pull, "pull the image from the registry if newer or not present in store, if false, only pull the image if not present, if always, pull the image even if the named image is present in store, if never, only use the image present in store if available")
	fs.Lookup("pull").NoOptDefVal = "true" //allow `--pull ` to be set to `true` as expected.

	fs.BoolVar(&opts.pullAlways, "pull-always", opts.pullAlways, "pull the image even if the named image is present in store")
	fs.BoolVar(&opts.pullNever, "pull-never", opts.pullNever, "do not pull the image, use the image present in store if available")
	fs.BoolVarP(&opts.quiet, "quiet", "q", opts.quiet, "don't output progress information when pulling images")
	fs.StringVar(&opts.signaturePolicy, "signature-policy", opts.signaturePolicy, "`pathname` of signature policy file (not usually used)")
	fs.StringVar(&suffix, "suffix", "", "suffix to add to intermediate containers")
	fs.BoolVar(&opts.tlsVerify, "tls-verify", opts.tlsVerify, "require HTTPS and verify certificates when accessing the registry. TLS verification cannot be used when talking to an insecure registry.")
	bailOnError(markFlagsHidden(fs, "pull-always", "pull-never", "suffix", "signature-policy", "tls-verify"), "")

	// Add in the common flags
	fromAndBudFlags, err := buildahcli.GetFromAndBudFlags(opts.FromAndBudResults, opts.UserNSResults, opts.NameSpaceResults)
	bailOnError(err, "failed to setup From and Bud flags")

	fs.AddFlagSet(&fromAndBudFlags)
	fs.SetNormalizeFunc(buildahcli.AliasFlags)
}

var suffix string

func newFromCommand() *cobra.Command {
	var (
		fromDescription = "\n  Creates a new working container, either from scratch or using a specified\n  image as a starting point."
		opts            = newDefaultFromReply()
	)

	fromCommand := &cobra.Command{
		Use:    "from",
		Hidden: true,
		Short:  "Create a working container based on an image",
		Long:   fromDescription,
		RunE: func(cmd *cobra.Command, args []string) error {
			return fromCmd(cmd, args, opts)
		},
		Example: fmt.Sprintf(`%[1]s from --pull imagename
  %[1]s from docker-daemon:imagename:imagetag
  %[1]s from --name "myimagename" myregistry/myrepository/imagename:imagetag`, rootCmd.CommandPath()),
	}
	fromCommand.SetUsageTemplate(UsageTemplate())
	opts.RegisterFlags(fromCommand.Flags())

	return fromCommand
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
				stdout = io.Discard
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
			logger.Error("unknown OnBuild command %q; ignored", onBuildSpec)
		}
	}
	builder.ClearOnBuild()
	return nil
}

func fromCmd(c *cobra.Command, args []string, iopts *fromReply) error {
	if len(args) == 0 {
		return errors.New("an image name (or \"scratch\") must be specified")
	}
	if err := buildahcli.VerifyFlagsArgsOrder(args); err != nil {
		return err
	}
	if len(args) > 1 {
		return errors.New("too many arguments specified")
	}
	if err := setDefaultFlagsWithSetters(c, setDefaultTLSVerifyFlag); err != nil {
		return err
	}
	if err := auth.CheckAuthFile(iopts.authfile); err != nil {
		return err
	}
	systemContext, err := parse.SystemContextFromOptions(c)
	if err != nil {
		return fmt.Errorf("building system context: %w", err)
	}
	platforms, err := parse.PlatformsFromOptions(c)
	if err != nil {
		return err
	}
	if len(platforms) > 1 {
		logger.Warn("ignoring platforms other than %+v: %+v", platforms[0], platforms[1:])
	}

	pullFlagsCount := 0
	if c.Flag("pull").Changed {
		pullFlagsCount++
	}
	if c.Flag("pull-always").Changed {
		pullFlagsCount++
	}
	if c.Flag("pull-never").Changed {
		pullFlagsCount++
	}

	if pullFlagsCount > 1 {
		return errors.New("can only set one of 'pull' or 'pull-always' or 'pull-never'")
	}

	store, err := getStore(c)
	if err != nil {
		return err
	}
	builder, err := doFrom(c, args[0], iopts, store, systemContext)
	if err != nil {
		return err
	}
	if iopts.cidfile != "" {
		filePath := iopts.cidfile
		if err := os.WriteFile(filePath, []byte(builder.ContainerID), 0644); err != nil {
			return fmt.Errorf("failed to write container ID file %q: %w", filePath, err)
		}
	}
	fmt.Printf("%s\n", builder.Container)
	return nil
}

func doFrom(c *cobra.Command, image string, iopts *fromReply,
	store storage.Store,
	systemContext *types.SystemContext,
) (*buildah.Builder, error) {
	defaultContainerConfig, err := config.Default()
	if err != nil {
		return nil, err
	}
	if systemContext == nil {
		systemContext, err = parse.SystemContextFromOptions(c)
		if err != nil {
			return nil, err
		}
	}
	// Allow for --pull, --pull=true, --pull=false, --pull=never, --pull=always
	// --pull-always and --pull-never.  The --pull-never and --pull-always options
	// will not be documented.
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
	logger.Debug("Pull Policy for pull [%v]", pullPolicy)

	commonOpts, err := parse.CommonBuildOptions(c)
	if err != nil {
		return nil, err
	}

	isolation, err := parse.IsolationOption(iopts.Isolation)
	if err != nil {
		return nil, err
	}

	namespaceOptions, networkPolicy, err := parse.NamespaceOptions(c)
	if err != nil {
		return nil, fmt.Errorf("parsing namespace-related options: %w", err)
	}
	usernsOption, idmappingOptions, err := parse.IDMappingOptions(c, isolation)
	if err != nil {
		return nil, fmt.Errorf("parsing ID mapping options: %w", err)
	}
	namespaceOptions.AddOrReplace(usernsOption...)

	format, err := util.GetFormat(iopts.format)
	if err != nil {
		return nil, err
	}
	devices := define.ContainerDevices{}
	for _, device := range append(defaultContainerConfig.Containers.Devices, iopts.Devices...) {
		dev, err := parse.DeviceFromPath(device)
		if err != nil {
			return nil, err
		}
		devices = append(devices, dev...)
	}

	capabilities, err := defaultContainerConfig.Capabilities("", iopts.CapAdd, iopts.CapDrop)
	if err != nil {
		return nil, err
	}

	commonOpts.Ulimit = append(defaultContainerConfig.Containers.DefaultUlimits, commonOpts.Ulimit...)

	decConfig, err := util.DecryptConfig(iopts.DecryptionKeys)
	if err != nil {
		return nil, fmt.Errorf("unable to obtain decrypt config: %w", err)
	}

	var pullPushRetryDelay time.Duration
	pullPushRetryDelay, err = time.ParseDuration(iopts.RetryDelay)
	if err != nil {
		return nil, fmt.Errorf("unable to parse value provided %q as --retry-delay: %w", iopts.RetryDelay, err)
	}

	options := buildah.BuilderOptions{
		FromImage:             image,
		Container:             iopts.name,
		ContainerSuffix:       suffix,
		PullPolicy:            pullPolicy,
		SignaturePolicyPath:   iopts.signaturePolicy,
		SystemContext:         systemContext,
		DefaultMountsFilePath: globalFlagResults.DefaultMountsFile,
		Isolation:             isolation,
		NamespaceOptions:      namespaceOptions,
		ConfigureNetwork:      networkPolicy,
		CNIPluginPath:         iopts.CNIPlugInPath,
		CNIConfigDir:          iopts.CNIConfigDir,
		IDMappingOptions:      idmappingOptions,
		Capabilities:          capabilities,
		CommonBuildOpts:       commonOpts,
		Format:                format,
		BlobDirectory:         iopts.BlobCache,
		Devices:               devices,
		MaxPullRetries:        iopts.Retry,
		PullRetryDelay:        pullPushRetryDelay,
		OciDecryptConfig:      decConfig,
	}

	if !iopts.quiet {
		options.ReportWriter = os.Stderr
	}

	builder, err := buildah.NewBuilder(getContext(), store, options)
	if err != nil {
		return nil, err
	}

	if err := onBuild(builder, iopts.quiet); err != nil {
		return nil, err
	}
	if err := builder.Save(); err != nil {
		return nil, err
	}
	return builder, nil
}
