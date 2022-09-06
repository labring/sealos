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

package registry

import (
	"context"
	"fmt"
	"os"
	"runtime"

	"github.com/labring/sealos/pkg/image/types"
	"github.com/labring/sealos/pkg/utils/logger"

	"github.com/containers/buildah/define"
	"github.com/containers/buildah/pkg/parse"
	"github.com/containers/buildah/util"
	"github.com/containers/common/libimage"
	"github.com/containers/common/libimage/manifests"
	"github.com/containers/common/pkg/auth"
	"github.com/containers/common/pkg/config"
	"github.com/containers/common/pkg/umask"
	cp "github.com/containers/image/v5/copy"
	"github.com/containers/image/v5/manifest"
	is "github.com/containers/image/v5/storage"
	"github.com/containers/image/v5/transports/alltransports"
	ct "github.com/containers/image/v5/types"
	encconfig "github.com/containers/ocicrypt/config"
	enchelpers "github.com/containers/ocicrypt/helpers"
	"github.com/containers/storage"
	"github.com/containers/storage/pkg/unshare"
	imgspecv1 "github.com/opencontainers/image-spec/specs-go/v1"
	"github.com/pkg/errors"
	"github.com/spf13/cobra"
)

func getDecryptConfig(decryptionKeys []string) (*encconfig.DecryptConfig, error) {
	decConfig := &encconfig.DecryptConfig{}
	if len(decryptionKeys) > 0 {
		// decryption
		dcc, err := enchelpers.CreateCryptoConfig([]string{}, decryptionKeys)
		if err != nil {
			return nil, errors.Wrapf(err, "invalid decryption keys")
		}
		cc := encconfig.CombineCryptoConfigs([]encconfig.CryptoConfig{dcc})
		decConfig = cc.DecryptConfig
	}

	return decConfig, nil
}

func getStore(globalFlagResults *types.GlobalBuildahFlags) (storage.Store, error) {
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
	return store, err
}

/*
func getAuthFile(authfile string) string {
	if authfile != "" {
		return authfile
	}
	return os.Getenv("REGISTRY_AUTH_FILE")
}*/

// setXDGRuntimeDir sets XDG_RUNTIME_DIR when if it is unset under rootless
func setXDGRuntimeDir() error {
	if unshare.IsRootless() && os.Getenv("XDG_RUNTIME_DIR") == "" {
		runtimeDir, err := storage.GetRootlessRuntimeDir(unshare.GetRootlessUID())
		if err != nil {
			return err
		}
		if err := os.Setenv("XDG_RUNTIME_DIR", runtimeDir); err != nil {
			return errors.New("could not set XDG_RUNTIME_DIR")
		}
	}
	return nil
}

func newGlobalOptions() *types.GlobalBuildahFlags {
	var (
		defaultStoreDriverOptions []string
	)
	storageOptions, err := storage.DefaultStoreOptions(false, 0)
	if err != nil {
		logger.Error(err.Error())
		os.Exit(1)
	}
	if len(storageOptions.GraphDriverOptions) > 0 {
		optionSlice := storageOptions.GraphDriverOptions[:]
		defaultStoreDriverOptions = optionSlice
	}
	containerConfig, err := config.Default()
	if err != nil {
		logger.Error(err.Error())
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

func manifestPush(systemContext *ct.SystemContext, store storage.Store, listImageSpec, destSpec string, opts types.PushOptions) error {
	runtimeFromStore, err := libimage.RuntimeFromStore(store, &libimage.RuntimeOptions{SystemContext: systemContext})
	if err != nil {
		return err
	}

	manifestList, err := runtimeFromStore.LookupManifestList(listImageSpec)
	if err != nil {
		return err
	}

	_, list, err := manifests.LoadFromImage(store, manifestList.ID())
	if err != nil {
		return err
	}

	dest, err := alltransports.ParseImageName(destSpec)
	if err != nil {
		return err
	}

	var manifestType string
	if opts.Format != "" {
		switch opts.Format {
		case "oci":
			manifestType = imgspecv1.MediaTypeImageManifest
		case "v2s2", "docker":
			manifestType = manifest.DockerV2Schema2MediaType
		default:
			return errors.Errorf("unknown format %q. Choose on of the supported formats: 'oci' or 'v2s2'", opts.Format)
		}
	}

	options := manifests.PushOptions{
		Store:              store,
		SystemContext:      systemContext,
		ImageListSelection: cp.CopySpecificImages,
		Instances:          nil,
		RemoveSignatures:   opts.RemoveSignatures,
		SignBy:             opts.SignBy,
		ManifestType:       manifestType,
	}
	if opts.All {
		options.ImageListSelection = cp.CopyAllImages
	}
	if !opts.Quiet {
		options.ReportWriter = os.Stderr
	}

	_, digest, err := list.Push(context.TODO(), dest, options)

	if err == nil && opts.Rm {
		_, err = store.DeleteImage(manifestList.ID(), true)
	}

	if opts.Digestfile != "" {
		if err = os.WriteFile(opts.Digestfile, []byte(digest.String()), 0644); err != nil {
			return util.GetFailureCause(err, errors.Wrapf(err, "failed to write digest to file %q", opts.Digestfile))
		}
	}

	return err
}

func getEncryptConfig(encryptionKeys []string, encryptLayers []int) (*encconfig.EncryptConfig, *[]int, error) {
	var encLayers *[]int
	var encConfig *encconfig.EncryptConfig

	if len(encryptionKeys) > 0 {
		// encryption
		encLayers = &encryptLayers
		ecc, err := enchelpers.CreateCryptoConfig(encryptionKeys, []string{})
		if err != nil {
			return nil, nil, errors.Wrapf(err, "invalid encryption keys")
		}
		cc := encconfig.CombineCryptoConfigs([]encconfig.CryptoConfig{ecc})
		encConfig = cc.EncryptConfig
	}
	return encConfig, encLayers, nil
}

// pull push login
// Currently, only TLS is set
func getSystemContext(tls bool) (*ct.SystemContext, error) {
	certDir := ""
	ctx := &ct.SystemContext{
		DockerCertPath: certDir,
	}
	tlsVerify := tls
	ctx.DockerInsecureSkipTLSVerify = ct.NewOptionalBool(!tlsVerify)
	ctx.OCIInsecureSkipTLSVerify = !tlsVerify
	ctx.DockerDaemonInsecureSkipTLSVerify = !tlsVerify
	//
	ctx.OCIAcceptUncompressedLayers = true
	//
	//creds := opts.creds
	//
	//var err error
	//ctx.DockerAuthConfig, err = parse.AuthConfig(creds)
	//if err != nil {
	//	return nil, err
	//}
	//
	//sigPolicy := opts.signaturePolicy
	//ctx.SignaturePolicyPath = sigPolicy
	//
	//authfile := opts.authfile
	//ctx.AuthFilePath = getAuthFile(authfile)
	//
	//regConf := ""
	//ctx.SystemRegistriesConfPath = regConf
	//
	//regConfDir := ""
	//ctx.RegistriesDirPath = regConfDir
	//
	//shortNameAliasConf := ""
	//ctx.UserShortNameAliasConfPath = shortNameAliasConf

	ctx.DockerRegistryUserAgent = fmt.Sprintf("Buildah/%s", define.Version)

	ctx.OSChoice = runtime.GOOS

	ctx.ArchitectureChoice = runtime.GOARCH

	ctx.VariantChoice = ""

	ctx.BigFilesTemporaryDir = parse.GetTempDir()
	return ctx, nil
}

type loginReply struct {
	loginOpts auth.LoginOptions
	getLogin  bool
	tlsVerify bool
}

func getCmdFlag() *cobra.Command {
	var opts pullOptions
	pullCommand := &cobra.Command{}

	flags := pullCommand.Flags()
	flags.SetInterspersed(false)
	flags.BoolVarP(&opts.allTags, "all-tags", "a", false, "download all tagged images in the repository")
	flags.StringVar(&opts.authfile, "authfile", auth.GetDefaultAuthFile(), "path of the authentication file. Use REGISTRY_AUTH_FILE environment variable to override")
	flags.StringVar(&opts.blobCache, "blob-cache", "", "store copies of pulled image blobs in the specified directory")
	flags.StringVar(&opts.certDir, "cert-dir", "", "use certificates at the specified path to access the registry")
	flags.StringVar(&opts.creds, "creds", "", "use `[username[:password]]` for accessing the registry")
	flags.StringVar(&opts.pullPolicy, "policy", "missing", "missing, always, or never.")
	flags.BoolVarP(&opts.removeSignatures, "remove-signatures", "", false, "don't copy signatures when pulling image")
	flags.StringVar(&opts.signaturePolicy, "signature-policy", "", "`pathname` of signature policy file (not usually used)")
	flags.StringSliceVar(&opts.decryptionKeys, "decryption-key", nil, "key needed to decrypt the image")
	if err := flags.MarkHidden("signature-policy"); err != nil {
		panic(fmt.Sprintf("error marking signature-policy as hidden: %v", err))
	}
	flags.BoolVarP(&opts.quiet, "quiet", "q", false, "don't output progress information when pulling images")
	flags.String("os", runtime.GOOS, "prefer `OS` instead of the running OS for choosing images")
	flags.String("arch", runtime.GOARCH, "prefer `ARCH` instead of the architecture of the machine for choosing images")
	flags.StringSlice("platform", []string{parse.DefaultPlatform()}, "prefer OS/ARCH instead of the current operating system and architecture for choosing images")
	flags.String("variant", "", "override the `variant` of the specified image")
	flags.BoolVar(&opts.tlsVerify, "tls-verify", false, "require HTTPS and verify certificates when accessing the registry. TLS verification cannot be used when talking to an insecure registry.")
	if err := flags.MarkHidden("blob-cache"); err != nil {
		panic(fmt.Sprintf("error marking blob-cache as hidden: %v", err))
	}
	return pullCommand
}

func getPushCmdFlag() *cobra.Command {
	var opts types.PushOptions
	pushCommand := &cobra.Command{}

	flags := pushCommand.Flags()
	flags.SetInterspersed(false)
	flags.BoolVar(&opts.All, "all", false, "push all of the images referenced by the manifest list")
	flags.StringVar(&opts.Authfile, "authfile", auth.GetDefaultAuthFile(), "path of the authentication file. Use REGISTRY_AUTH_FILE environment variable to override")
	flags.StringVar(&opts.BlobCache, "blob-cache", "", "assume image blobs in the specified directory will be available for pushing")
	flags.StringVar(&opts.CertDir, "cert-dir", "", "use certificates at the specified path to access the registry")
	flags.StringVar(&opts.Creds, "creds", "", "use `[username[:password]]` for accessing the registry")
	flags.StringVar(&opts.Digestfile, "digestfile", "", "after copying the image, write the digest of the resulting image to the file")
	flags.BoolVarP(&opts.DisableCompression, "disable-compression", "D", false, "don't compress layers")
	flags.StringVarP(&opts.Format, "format", "f", "", "manifest type (oci, v2s1, or v2s2) to use in the destination (default is manifest type of source, with fallbacks)")
	flags.StringVar(&opts.CompressionFormat, "compression-format", "", "compression format to use")
	flags.IntVar(&opts.CompressionLevel, "compression-level", 0, "compression level to use")
	flags.BoolVarP(&opts.Quiet, "quiet", "q", false, "don't output progress information when pushing images")
	flags.BoolVar(&opts.Rm, "rm", false, "remove the manifest list if push succeeds")
	flags.BoolVarP(&opts.RemoveSignatures, "remove-signatures", "", false, "don't copy signatures when pushing image")
	flags.StringVar(&opts.SignBy, "sign-by", "", "sign the image using a GPG key with the specified `FINGERPRINT`")
	flags.StringVar(&opts.SignaturePolicy, "signature-policy", "", "`pathname` of signature policy file (not usually used)")
	flags.StringSliceVar(&opts.EncryptionKeys, "encryption-key", nil, "key with the encryption protocol to use needed to encrypt the image (e.g. jwe:/path/to/key.pem)")
	flags.IntSliceVar(&opts.EncryptLayers, "encrypt-layer", nil, "layers to encrypt, 0-indexed layer indices with support for negative indexing (e.g. 0 is the first layer, -1 is the last layer). If not defined, will encrypt all layers if encryption-key flag is specified")

	if err := flags.MarkHidden("signature-policy"); err != nil {
		panic(fmt.Sprintf("error marking signature-policy as hidden: %v", err))
	}
	flags.BoolVar(&opts.TLSVerify, "tls-verify", false, "require HTTPS and verify certificates when accessing the registry. TLS verification cannot be used when talking to an insecure registry.")
	if err := flags.MarkHidden("blob-cache"); err != nil {
		panic(fmt.Sprintf("error marking blob-cache as hidden: %v", err))
	}
	return pushCommand
}
