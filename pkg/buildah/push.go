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
	"os"
	"strings"
	"time"

	"github.com/containers/buildah"
	"github.com/containers/buildah/define"
	buildahcli "github.com/containers/buildah/pkg/cli"
	"github.com/containers/buildah/pkg/parse"
	"github.com/containers/buildah/util"
	"github.com/containers/common/pkg/auth"
	"github.com/containers/image/v5/manifest"
	"github.com/containers/image/v5/pkg/compression"
	"github.com/containers/image/v5/transports"
	"github.com/containers/image/v5/transports/alltransports"
	"github.com/containers/storage"
	imgspecv1 "github.com/opencontainers/image-spec/specs-go/v1"
	"github.com/spf13/cobra"
	"github.com/spf13/pflag"

	iutil "github.com/labring/sealos/pkg/buildah/internal/util"
	"github.com/labring/sealos/pkg/utils/logger"
)

type pushOptions struct {
	all                bool
	authfile           string
	blobCache          string
	certDir            string
	creds              string
	digestfile         string
	disableCompression bool
	format             string
	compressionFormat  string
	compressionLevel   int
	retry              int
	retryDelay         time.Duration
	rm                 bool
	quiet              bool
	removeSignatures   bool
	signaturePolicy    string
	signBy             string
	tlsVerify          bool
	encryptionKeys     []string
	encryptLayers      []int
	insecure           bool
}

func newDefaultPushOptions() *pushOptions {
	return &pushOptions{
		authfile:   auth.GetDefaultAuthFile(),
		retry:      buildahcli.MaxPullPushRetries,
		retryDelay: buildahcli.PullPushRetryDelay,
		tlsVerify:  true,
	}
}

func (opts *pushOptions) RegisterFlags(fs *pflag.FlagSet) error {
	fs.SetInterspersed(false)
	fs.BoolVar(&opts.all, "all", opts.all, "push all of the images referenced by the manifest list")
	fs.StringVar(&opts.authfile, "authfile", opts.authfile, "path of the authentication file. Use REGISTRY_AUTH_FILE environment variable to override")
	fs.StringVar(&opts.blobCache, "blob-cache", opts.blobCache, "assume image blobs in the specified directory will be available for pushing")
	fs.StringVar(&opts.certDir, "cert-dir", opts.certDir, "use certificates at the specified path to access the registry")
	fs.StringVar(&opts.creds, "creds", opts.creds, "use `[username[:password]]` for accessing the registry")
	fs.StringVar(&opts.digestfile, "digestfile", opts.digestfile, "after copying the image, write the digest of the resulting image to the file")
	fs.BoolVarP(&opts.disableCompression, "disable-compression", "D", false, "don't compress layers")
	fs.StringVarP(&opts.format, "format", "f", opts.format, "manifest type (oci, v2s1, or v2s2) to use in the destination (default is manifest type of source, with fallbacks)")
	fs.StringVar(&opts.compressionFormat, "compression-format", opts.compressionFormat, "compression format to use")
	fs.IntVar(&opts.compressionLevel, "compression-level", opts.compressionLevel, "compression level to use")
	fs.BoolVarP(&opts.quiet, "quiet", "q", opts.quiet, "don't output progress information when pushing images")
	fs.IntVar(&opts.retry, "retry", opts.retry, "number of times to retry in case of failure when performing push/pull")
	fs.DurationVar(&opts.retryDelay, "retry-delay", opts.retryDelay, "delay between retries in case of push/pull failures")
	fs.BoolVar(&opts.rm, "rm", opts.rm, "remove the manifest list if push succeeds")
	fs.BoolVarP(&opts.removeSignatures, "remove-signatures", "", opts.removeSignatures, "don't copy signatures when pushing image")
	fs.StringVar(&opts.signBy, "sign-by", opts.signBy, "sign the image using a GPG key with the specified `FINGERPRINT`")
	fs.StringVar(&opts.signaturePolicy, "signature-policy", opts.signaturePolicy, "`pathname` of signature policy file (not usually used)")
	fs.StringSliceVar(&opts.encryptionKeys, "encryption-key", opts.encryptionKeys, "key with the encryption protocol to use needed to encrypt the image (e.g. jwe:/path/to/key.pem)")
	fs.IntSliceVar(&opts.encryptLayers, "encrypt-layer", opts.encryptLayers, "layers to encrypt, 0-indexed layer indices with support for negative indexing (e.g. 0 is the first layer, -1 is the last layer). If not defined, will encrypt all layers if encryption-key flag is specified")
	fs.BoolVar(&opts.tlsVerify, "tls-verify", opts.tlsVerify, "require HTTPS and verify certificates when accessing the registry. TLS verification cannot be used when talking to an insecure registry.")
	return markFlagsHidden(fs, []string{"signature-policy", "blob-cache"}...)
}

func newPushCommand() *cobra.Command {
	var (
		opts            = newDefaultPushOptions()
		pushDescription = fmt.Sprintf(`
  Pushes an image to a specified location.

  The Image "DESTINATION" uses a "transport":"details" format. If not specified, will reuse source IMAGE as DESTINATION.

  Supported transports:
  %s
`, getListOfTransports())
	)

	pushCommand := &cobra.Command{
		Use:   "push",
		Short: "Push an image to a specified destination",
		Long:  pushDescription,
		RunE: func(cmd *cobra.Command, args []string) error {
			return pushCmd(cmd, args, opts)
		},
		Example: fmt.Sprintf(`%[1]s push imageID docker://registry.example.com/repository:tag
  %[1]s push imageID docker-daemon:image:tagi
  %[1]s push imageID oci:/path/to/layout:image:tag`, rootCmd.Name()),
	}
	pushCommand.SetUsageTemplate(UsageTemplate())
	err := opts.RegisterFlags(pushCommand.Flags())
	bailOnError(err, "failed to register push option flags")
	return pushCommand
}

func pushCmd(c *cobra.Command, args []string, iopts *pushOptions) error {
	var src, destSpec string

	if err := buildahcli.VerifyFlagsArgsOrder(args); err != nil {
		return err
	}
	if err := auth.CheckAuthFile(iopts.authfile); err != nil {
		return err
	}

	switch len(args) {
	case 0:
		return errors.New("at least a source image ID must be specified")
	case 1:
		src = args[0]
		destSpec = src
		logger.Debug("Destination argument not specified, assuming the same as the source: %s", destSpec)
	case 2:
		src = args[0]
		destSpec = args[1]
		if src == "" {
			return fmt.Errorf(`invalid image name "%s"`, args[0])
		}
	default:
		return errors.New("only two arguments are necessary to push: source and destination")
	}

	compress := define.Gzip
	if iopts.disableCompression {
		compress = define.Uncompressed
	}

	store, err := getStore(c)
	if err != nil {
		return err
	}

	dest, err := alltransports.ParseImageName(destSpec)
	// add the docker:// transport to see if they neglected it.
	if err != nil {
		destTransport := strings.Split(destSpec, ":")[0]
		if t := transports.Get(destTransport); t != nil {
			return err
		}

		if strings.Contains(destSpec, "://") {
			return err
		}

		destSpec = "docker://" + destSpec
		dest2, err2 := alltransports.ParseImageName(destSpec)
		if err2 != nil {
			return err
		}
		dest = dest2
		logger.Debug("Assuming docker:// as the transport method for DESTINATION: %s", destSpec)
	}

	systemContext, err := parse.SystemContextFromOptions(c)
	if err != nil {
		return fmt.Errorf("building system context: %w", err)
	}

	var manifestType string
	if iopts.format != "" {
		switch iopts.format {
		case "oci":
			manifestType = imgspecv1.MediaTypeImageManifest
		case "v2s1":
			manifestType = manifest.DockerV2Schema1SignedMediaType
		case "v2s2", "docker":
			manifestType = manifest.DockerV2Schema2MediaType
		default:
			return fmt.Errorf("unknown format %q. Choose on of the supported formats: 'oci', 'v2s1', or 'v2s2'", iopts.format)
		}
	}

	encConfig, encLayers, err := iutil.EncryptConfig(iopts.encryptionKeys, iopts.encryptLayers)
	if err != nil {
		return fmt.Errorf("unable to obtain encryption config: %w", err)
	}

	options := buildah.PushOptions{
		Compression:         compress,
		ManifestType:        manifestType,
		SignaturePolicyPath: iopts.signaturePolicy,
		Store:               store,
		SystemContext:       systemContext,
		BlobDirectory:       iopts.blobCache,
		RemoveSignatures:    iopts.removeSignatures,
		SignBy:              iopts.signBy,
		MaxRetries:          iopts.retry,
		RetryDelay:          iopts.retryDelay,
		OciEncryptConfig:    encConfig,
		OciEncryptLayers:    encLayers,
	}
	if !iopts.quiet {
		options.ReportWriter = os.Stderr
	}
	if iopts.compressionFormat != "" {
		algo, err := compression.AlgorithmByName(iopts.compressionFormat)
		if err != nil {
			return err
		}
		options.CompressionFormat = &algo
	}
	if flagChanged(c, "compression-level") {
		options.CompressionLevel = &iopts.compressionLevel
	}

	ref, digest, err := buildah.Push(getContext(), src, dest, options)
	if err != nil {
		if !errors.Is(err, storage.ErrImageUnknown) {
			// Image might be a manifest so attempt a manifest push
			if manifestsErr := manifestPush(systemContext, store, src, destSpec, *iopts); manifestsErr == nil {
				return nil
			}
		}
		return util.GetFailureCause(err, fmt.Errorf("pushing image %q to %q: %w", src, destSpec, err))
	}
	if ref != nil {
		logger.Debug("pushed image %q with digest %s", ref, digest.String())
	} else {
		logger.Debug("pushed image with digest %s", digest.String())
	}

	logger.Debug("Successfully pushed %s with digest %s", transports.ImageName(dest), digest.String())

	if iopts.digestfile != "" {
		if err = os.WriteFile(iopts.digestfile, []byte(digest.String()), 0644); err != nil {
			return util.GetFailureCause(err, fmt.Errorf("failed to write digest to file %q: %w", iopts.digestfile, err))
		}
	}

	return nil
}

// getListOfTransports gets the transports supported from the image library
// and strips of the "tarball" transport from the string of transports returned
func getListOfTransports() string {
	allTransports := strings.Join(transports.ListNames(), ",")
	return strings.Replace(allTransports, ",tarball", "", 1)
}
