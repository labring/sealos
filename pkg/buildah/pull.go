package buildah

import (
	"errors"
	"fmt"
	"os"
	"runtime"
	"time"

	"github.com/containers/buildah"
	"github.com/containers/buildah/define"
	buildahcli "github.com/containers/buildah/pkg/cli"
	"github.com/containers/buildah/pkg/parse"
	"github.com/containers/common/pkg/auth"
	"github.com/spf13/cobra"
	"github.com/spf13/pflag"

	"github.com/labring/sealos/pkg/buildah/internal/util"
	"github.com/labring/sealos/pkg/utils/logger"
)

type pullOptions struct {
	allTags          bool
	authfile         string
	blobCache        string
	certDir          string
	creds            string
	signaturePolicy  string
	quiet            bool
	removeSignatures bool
	tlsVerify        bool
	decryptionKeys   []string
	pullPolicy       string
	retry            int
	retryDelay       time.Duration
}

func (opts *pullOptions) HiddenFlags() []string {
	return []string{
		"signature-policy", "blob-cache",
	}
}

func newDefaultPullOptions() *pullOptions {
	return &pullOptions{
		authfile:   auth.GetDefaultAuthFile(),
		pullPolicy: "missing",
		tlsVerify:  true,
		retry:      buildahcli.MaxPullPushRetries,
		retryDelay: buildahcli.PullPushRetryDelay,
	}
}

func (opts *pullOptions) RegisterFlags(fs *pflag.FlagSet) error {
	fs.SetInterspersed(false)
	fs.BoolVarP(&opts.allTags, "all-tags", "a", opts.allTags, "download all tagged images in the repository")
	fs.StringVar(&opts.authfile, "authfile", opts.authfile, "path of the authentication file. Use REGISTRY_AUTH_FILE environment variable to override")
	fs.StringVar(&opts.blobCache, "blob-cache", opts.blobCache, "store copies of pulled image blobs in the specified directory")
	fs.StringVar(&opts.certDir, "cert-dir", opts.certDir, "use certificates at the specified path to access the registry")
	fs.StringVar(&opts.creds, "creds", opts.creds, "use `[username[:password]]` for accessing the registry")
	fs.StringVar(&opts.pullPolicy, "policy", opts.pullPolicy, "missing, always, or never.")
	fs.BoolVar(&opts.removeSignatures, "remove-signatures", opts.removeSignatures, "don't copy signatures when pulling image")
	fs.StringVar(&opts.signaturePolicy, "signature-policy", opts.signaturePolicy, "`pathname` of signature policy file (not usually used)")
	fs.StringSliceVar(&opts.decryptionKeys, "decryption-key", opts.decryptionKeys, "key needed to decrypt the image")
	fs.BoolVarP(&opts.quiet, "quiet", "q", false, "don't output progress information when pulling images")
	fs.String("os", runtime.GOOS, "prefer `OS` instead of the running OS for choosing images")
	fs.String("arch", runtime.GOARCH, "prefer `ARCH` instead of the architecture of the machine for choosing images")
	fs.StringSlice("platform", []string{parse.DefaultPlatform()}, "prefer OS/ARCH instead of the current operating system and architecture for choosing images")
	fs.String("variant", "", "override the `variant` of the specified image")
	fs.BoolVar(&opts.tlsVerify, "tls-verify", opts.tlsVerify, "require HTTPS and verify certificates when accessing the registry. TLS verification cannot be used when talking to an insecure registry.")
	fs.IntVar(&opts.retry, "retry", opts.retry, "number of times to retry in case of failure when performing pull")
	fs.DurationVar(&opts.retryDelay, "retry-delay", opts.retryDelay, "delay between retries in case of pull failures")
	return markFlagsHidden(fs, opts.HiddenFlags()...)
}

func newPullCommand() *cobra.Command {
	var (
		opts = newDefaultPullOptions()

		pullDescription = `  Pulls an image from a registry and stores it locally.
  An image can be pulled using its tag or digest. If a tag is not
  specified, the image with the 'latest' tag (if it exists) is pulled.`
	)

	pullCommand := &cobra.Command{
		Use:   "pull",
		Short: "Pull an image from the specified location",
		Long:  pullDescription,
		RunE: func(cmd *cobra.Command, args []string) error {
			return pullCmd(cmd, args, opts)
		},
		Example: fmt.Sprintf(`%[1]s pull imagename
  %[1]s pull docker-daemon:imagename:imagetag
  %[1]s pull myregistry/myrepository/imagename:imagetag`, rootCmdName),
	}
	pullCommand.SetUsageTemplate(UsageTemplate())

	opts.RegisterFlags(pullCommand.Flags())
	return pullCommand
}

func pullCmd(c *cobra.Command, args []string, iopts *pullOptions) error {
	if len(args) == 0 {
		return errors.New("an image name must be specified")
	}
	if err := buildahcli.VerifyFlagsArgsOrder(args); err != nil {
		return err
	}
	if len(args) > 1 {
		return errors.New("too many arguments specified")
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

	store, err := getStore(c)
	if err != nil {
		return err
	}

	decConfig, err := util.DecryptConfig(iopts.decryptionKeys)
	if err != nil {
		return fmt.Errorf("unable to obtain decryption config: %w", err)
	}

	policy, ok := define.PolicyMap[iopts.pullPolicy]
	if !ok {
		return fmt.Errorf("unsupported pull policy %q", iopts.pullPolicy)
	}
	options := buildah.PullOptions{
		SignaturePolicyPath: iopts.signaturePolicy,
		Store:               store,
		SystemContext:       systemContext,
		BlobDirectory:       iopts.blobCache,
		AllTags:             iopts.allTags,
		ReportWriter:        os.Stderr,
		RemoveSignatures:    iopts.removeSignatures,
		MaxRetries:          iopts.retry,
		RetryDelay:          iopts.retryDelay,
		OciDecryptConfig:    decConfig,
		PullPolicy:          policy,
	}

	if iopts.quiet {
		options.ReportWriter = nil // Turns off logging output
	}

	id, err := buildah.Pull(getContext(), args[0], options)
	if err != nil {
		return err
	}
	fmt.Printf("%s\n", id)
	return nil
}
