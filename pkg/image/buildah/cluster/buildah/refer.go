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
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net"
	"os"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"
	"time"
	"unicode"

	pp "github.com/labring/sealos/pkg/image/buildah/cluster/buildah/parse"

	"github.com/containers/buildah"
	"github.com/containers/buildah/define"
	"github.com/containers/buildah/pkg/parse"
	"github.com/containers/buildah/util"
	"github.com/containers/common/libimage"
	"github.com/containers/common/pkg/config"
	"github.com/containers/common/pkg/umask"
	"github.com/containers/image/v5/manifest"
	is "github.com/containers/image/v5/storage"
	"github.com/containers/image/v5/transports"
	"github.com/containers/image/v5/transports/alltransports"
	ct "github.com/containers/image/v5/types"
	encconfig "github.com/containers/ocicrypt/config"
	enchelpers "github.com/containers/ocicrypt/helpers"
	"github.com/containers/storage"
	"github.com/containers/storage/pkg/idtools"
	"github.com/containers/storage/pkg/unshare"
	"github.com/docker/go-units"
	"github.com/opencontainers/runtime-spec/specs-go"
	"github.com/pkg/errors"
	"github.com/sirupsen/logrus"
	"github.com/spf13/pflag"
)

func getStore(globalFlagResults *globalFlags) (storage.Store, error) {
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

func newGlobalOptions() *globalFlags {
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
	return &globalFlags{
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

type globalFlags struct {
	Debug             bool
	LogLevel          string
	Root              string
	RunRoot           string
	StorageDriver     string
	RegistriesConf    string
	RegistriesConfDir string
	DefaultMountsFile string
	StorageOpts       []string
	UserNSUID         []string
	UserNSGID         []string
	CPUProfile        string
	//cpuProfileFile             *os.File
	MemoryProfile              string
	UserShortNameAliasConfPath string
	CgroupManager              string
}

func getGlobalOptionsFlag() *pflag.FlagSet {
	var defaultStoreDriverOptions []string

	var globalFlagResults globalFlags
	fs := pflag.FlagSet{}
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

	fs.BoolVar(&globalFlagResults.Debug, "debug", false, "print debugging information")
	// TODO Need to allow for environment variable
	fs.StringVar(&globalFlagResults.RegistriesConf, "registries-conf", "", "path to registries.conf file (not usually used)")
	fs.StringVar(&globalFlagResults.RegistriesConfDir, "registries-conf-dir", "", "path to registries.conf.d directory (not usually used)")
	fs.StringVar(&globalFlagResults.UserShortNameAliasConfPath, "short-name-alias-conf", "", "path to short name alias cache file (not usually used)")
	fs.StringVar(&globalFlagResults.Root, "root", storageOptions.GraphRoot, "storage root dir")
	fs.StringVar(&globalFlagResults.RunRoot, "runroot", storageOptions.RunRoot, "storage state dir")
	fs.StringVar(&globalFlagResults.CgroupManager, "cgroup-manager", containerConfig.Engine.CgroupManager, "cgroup manager")
	fs.StringVar(&globalFlagResults.StorageDriver, "storage-driver", storageOptions.GraphDriverName, "storage-driver")
	fs.StringSliceVar(&globalFlagResults.StorageOpts, "storage-opt", defaultStoreDriverOptions, "storage driver option")
	fs.StringSliceVar(&globalFlagResults.UserNSUID, "userns-uid-map", []string{}, "default `ctrID:hostID:length` UID mapping to use")
	fs.StringSliceVar(&globalFlagResults.UserNSGID, "userns-gid-map", []string{}, "default `ctrID:hostID:length` GID mapping to use")
	fs.StringVar(&globalFlagResults.DefaultMountsFile, "default-mounts-file", "", "path to default mounts file")
	fs.StringVar(&globalFlagResults.LogLevel, "logLevel", "warn", `The log level to be used. Either "trace", "debug", "info", "warn", "error", "fatal", or "panic".`)
	fs.StringVar(&globalFlagResults.CPUProfile, "cpu-profile", "", "`file` to write CPU profile")
	fs.StringVar(&globalFlagResults.MemoryProfile, "memory-profile", "", "`file` to write memory profile")

	return &fs
}

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

func openBuilders(store storage.Store) (builders []*buildah.Builder, err error) {
	return buildah.OpenAllBuilders(store)
}

func openBuilder(ctx context.Context, store storage.Store, name string) (builder *buildah.Builder, err error) {
	if name != "" {
		builder, err = buildah.OpenBuilder(store, name)
		if os.IsNotExist(errors.Cause(err)) {
			options := buildah.ImportOptions{
				Container: name,
			}
			builder, err = buildah.ImportBuilder(ctx, store, options)
		}
	}
	if err != nil {
		return nil, err
	}
	if builder == nil {
		return nil, errors.Errorf("error finding build container")
	}
	return builder, nil
}

// getContext returns a context.TODO
func getContext() context.Context {
	return context.TODO()
}

func defaultFormat() string {
	format := os.Getenv("BUILDAH_FORMAT")
	if format != "" {
		return format
	}
	return buildah.OCI
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

// CommonBuildOptionsFromFlagSet parses the build options from the bud cli
func CommonBuildOptionsFromFlagSet(flags *pflag.FlagSet) (*define.CommonBuildOptions, error) {
	var (
		memoryLimit int64
		memorySwap  int64
		noDNS       bool
		err         error
	)
	defaultContainerConfig, err := config.Default()
	if err != nil {
		return nil, errors.Wrapf(err, "failed to get container config")
	}

	memVal, _ := flags.GetString("memory")
	if memVal != "" {
		memoryLimit, err = units.RAMInBytes(memVal)
		if err != nil {
			return nil, errors.Wrapf(err, "invalid value for memory")
		}
	}

	memSwapValue, _ := flags.GetString("memory-swap")
	if memSwapValue != "" {
		if memSwapValue == "-1" {
			memorySwap = -1
		} else {
			memorySwap, err = units.RAMInBytes(memSwapValue)
			if err != nil {
				return nil, errors.Wrapf(err, "invalid value for memory-swap")
			}
		}
	}

	noHosts, _ := flags.GetBool("no-hosts")

	addHost, _ := flags.GetStringSlice("add-host")
	if len(addHost) > 0 {
		if noHosts {
			return nil, errors.Errorf("--no-hosts and --add-host conflict, can not be used together")
		}
		for _, host := range addHost {
			if err := validateExtraHost(host); err != nil {
				return nil, errors.Wrapf(err, "invalid value for add-host")
			}
		}
	}

	noDNS = false
	dnsServers := []string{}
	if flags.Changed("dns") {
		dnsServers, _ = flags.GetStringSlice("dns")
		for _, server := range dnsServers {
			if strings.ToLower(server) == "none" {
				noDNS = true
			}
		}
		if noDNS && len(dnsServers) > 1 {
			return nil, errors.Errorf("invalid --dns, --dns=none may not be used with any other --dns options")
		}
	}

	dnsSearch := []string{}
	if flags.Changed("dns-search") {
		dnsSearch, _ = flags.GetStringSlice("dns-search")
		if noDNS && len(dnsSearch) > 0 {
			return nil, errors.Errorf("invalid --dns-search, --dns-search may not be used with --dns=none")
		}
	}

	dnsOptions := []string{}
	if flags.Changed("dns-option") {
		dnsOptions, _ = flags.GetStringSlice("dns-option")
		if noDNS && len(dnsOptions) > 0 {
			return nil, errors.Errorf("invalid --dns-option, --dns-option may not be used with --dns=none")
		}
	}

	if _, err := units.FromHumanSize(defaultContainerConfig.Containers.ShmSize); err != nil {
		return nil, errors.Wrapf(err, "invalid --shm-size")
	}
	volumes, _ := flags.GetStringArray("volume")
	if err := Volumes(volumes); err != nil {
		return nil, err
	}
	cpuPeriod, _ := flags.GetUint64("cpu-period")
	cpuQuota, _ := flags.GetInt64("cpu-quota")
	cpuShares, _ := flags.GetUint64("cpu-shares")
	httpProxy, _ := flags.GetBool("http-proxy")
	identityLabel, _ := flags.GetBool("identity-label")

	ulimit := []string{}
	if flags.Changed("ulimit") {
		ulimit, _ = flags.GetStringSlice("ulimit")
	}

	secrets, _ := flags.GetStringArray("secret")
	sshsources, _ := flags.GetStringArray("ssh")

	cpuSetCPUs, _ := flags.GetString("cpuset-cpus")
	cpuSetMems, _ := flags.GetString("cpuset-mems")
	cgroupParent, _ := flags.GetString("cgroup-parent")
	shmSize := defaultContainerConfig.Containers.ShmSize

	commonOpts := &define.CommonBuildOptions{
		AddHost:       addHost,
		CPUPeriod:     cpuPeriod,
		CPUQuota:      cpuQuota,
		CPUSetCPUs:    cpuSetCPUs,
		CPUSetMems:    cpuSetMems,
		CPUShares:     cpuShares,
		CgroupParent:  cgroupParent,
		DNSOptions:    dnsOptions,
		DNSSearch:     dnsSearch,
		DNSServers:    dnsServers,
		HTTPProxy:     httpProxy,
		IdentityLabel: ct.NewOptionalBool(identityLabel),
		Memory:        memoryLimit,
		MemorySwap:    memorySwap,
		NoHosts:       noHosts,
		ShmSize:       shmSize,
		Ulimit:        ulimit,
		Volumes:       volumes,
		Secrets:       secrets,
		SSHSources:    sshsources,
	}
	securityOpts, _ := flags.GetStringArray("security-opt")
	if err := parseSecurityOpts(securityOpts, commonOpts); err != nil {
		return nil, err
	}
	return commonOpts, nil
}

// validateExtraHost validates that the specified string is a valid extrahost and returns it.
// ExtraHost is in the form of name:ip where the ip has to be a valid ip (ipv4 or ipv6).
// for add-host flag
func validateExtraHost(val string) error {
	// allow for IPv6 addresses in extra hosts by only splitting on first ":"
	arr := strings.SplitN(val, ":", 2)
	if len(arr) != 2 || len(arr[0]) == 0 {
		return errors.Errorf("bad format for add-host: %q", val)
	}
	if _, err := validateIPAddress(arr[1]); err != nil {
		return errors.Errorf("invalid IP address in add-host: %q", arr[1])
	}
	return nil
}

func parseSecurityOpts(securityOpts []string, commonOpts *define.CommonBuildOptions) error {
	for _, opt := range securityOpts {
		if opt == "no-new-privileges" {
			return errors.Errorf("no-new-privileges is not supported")
		}
		con := strings.SplitN(opt, "=", 2)
		if len(con) != 2 {
			return errors.Errorf("invalid --security-opt name=value pair: %q", opt)
		}

		switch con[0] {
		case "label":
			commonOpts.LabelOpts = append(commonOpts.LabelOpts, con[1])
		case "apparmor":
			commonOpts.ApparmorProfile = con[1]
		case "seccomp":
			commonOpts.SeccompProfilePath = con[1]
		default:
			return errors.Errorf("invalid --security-opt 2: %q", opt)
		}
	}

	if commonOpts.SeccompProfilePath == "" {
		if _, err := os.Stat(SeccompOverridePath); err == nil {
			commonOpts.SeccompProfilePath = SeccompOverridePath
		} else {
			if !os.IsNotExist(err) {
				return errors.WithStack(err)
			}
			if _, err := os.Stat(SeccompDefaultPath); err != nil {
				if !os.IsNotExist(err) {
					return errors.WithStack(err)
				}
			} else {
				commonOpts.SeccompProfilePath = SeccompDefaultPath
			}
		}
	}
	return nil
}

const (
	// SeccompDefaultPath defines the default seccomp path
	SeccompDefaultPath = "/usr/share/containers/seccomp.json"
	// SeccompOverridePath if this exists it overrides the default seccomp path
	SeccompOverridePath = "/etc/crio/seccomp.json"
	// TypeBind is the type for mounting host dir
	TypeBind = "bind"
	// TypeTmpfs is the type for mounting tmpfs
	TypeTmpfs = "tmpfs"
	// TypeCache is the type for mounting a common persistent cache from host
	TypeCache = "cache"
	// mount=type=cache must create a persistent directory on host so its available for all consecutive builds.
	// Lifecycle of following directory will be inherited from how host machine treats temporary directory
	BuildahCacheDir = "buildah-cache"
)

// validateIPAddress validates an Ip address.
// for dns, ip, and ip6 flags also
func validateIPAddress(val string) (string, error) {
	var ip = net.ParseIP(strings.TrimSpace(val))
	if ip != nil {
		return ip.String(), nil
	}
	return "", errors.Errorf("%s is not an ip address", val)
}

// Volume parses the input of --volume
func Volume(volume string) (specs.Mount, error) {
	return pp.Volume(volume)
}

// Volumes validates the host and container paths passed in to the --volume flag
func Volumes(volumes []string) error {
	if len(volumes) == 0 {
		return nil
	}
	for _, volume := range volumes {
		if _, err := Volume(volume); err != nil {
			return err
		}
	}
	return nil
}

// NamespaceOptionsFromFlagSet parses the build options for all namespaces except for user namespace.
func NamespaceOptions(flags *pflag.FlagSet) (namespaceOptions define.NamespaceOptions, networkPolicy define.NetworkConfigurationPolicy, err error) {
	options := make(define.NamespaceOptions, 0, 7)
	policy := define.NetworkDefault
	for _, what := range []string{"cgroupns", string(specs.IPCNamespace), "network", string(specs.PIDNamespace), string(specs.UTSNamespace)} {
		if flags.Lookup(what) != nil {
			how, _ := flags.GetString(what)
			switch what {
			case "cgroupns":
				what = string(specs.CgroupNamespace)
			}
			switch how {
			case "", "container", "private":
				logrus.Debugf("setting %q namespace to %q", what, "")
				policy = define.NetworkEnabled
				options.AddOrReplace(define.NamespaceOption{
					Name: what,
				})
			case "host":
				logrus.Debugf("setting %q namespace to host", what)
				policy = define.NetworkEnabled
				options.AddOrReplace(define.NamespaceOption{
					Name: what,
					Host: true,
				})
			default:
				if what == string(specs.NetworkNamespace) {
					if how == "none" {
						options.AddOrReplace(define.NamespaceOption{
							Name: what,
						})
						policy = define.NetworkDisabled
						logrus.Debugf("setting network to disabled")
						break
					}
				}
				how = strings.TrimPrefix(how, "ns:")
				// if not a path we assume it is a comma separated network list, see setupNamespaces() in run_linux.go
				if filepath.IsAbs(how) || what != string(specs.NetworkNamespace) {
					if _, err := os.Stat(how); err != nil {
						return nil, define.NetworkDefault, errors.Wrapf(err, "checking %s namespace", what)
					}
				}
				policy = define.NetworkEnabled
				logrus.Debugf("setting %q namespace to %q", what, how)
				options.AddOrReplace(define.NamespaceOption{
					Name: what,
					Path: how,
				})
			}
		}
	}
	return options, policy, nil
}

func getFormat(format string) (string, error) {
	switch format {
	case define.OCI:
		return define.OCIv1ImageManifest, nil
	case define.DOCKER:
		return define.Dockerv2ImageManifest, nil
	default:
		return "", errors.Errorf("unrecognized image type %q", format)
	}
}

func IDMappingOptions(flags *pflag.FlagSet, persistentFlags *pflag.FlagSet) (usernsOptions define.NamespaceOptions, idmapOptions *define.IDMappingOptions, err error) {
	user, _ := flags.GetString("userns-uid-map-user")
	group, _ := flags.GetString("userns-gid-map-group")
	// If only the user or group was specified, use the same value for the
	// other, since we need both in order to initialize the maps using the
	// names.
	if user == "" && group != "" {
		user = group
	}
	if group == "" && user != "" {
		group = user
	}
	// Either start with empty maps or the name-based maps.
	mappings := idtools.NewIDMappingsFromMaps(nil, nil)
	if user != "" && group != "" {
		submappings, err := idtools.NewIDMappings(user, group)
		if err != nil {
			return nil, nil, err
		}
		mappings = submappings
	}
	globalOptions := persistentFlags
	// We'll parse the UID and GID mapping options the same way.
	buildIDMap := func(basemap []idtools.IDMap, option string) ([]specs.LinuxIDMapping, error) {
		outmap := make([]specs.LinuxIDMapping, 0, len(basemap))
		// Start with the name-based map entries.
		for _, m := range basemap {
			outmap = append(outmap, specs.LinuxIDMapping{
				ContainerID: uint32(m.ContainerID),
				HostID:      uint32(m.HostID),
				Size:        uint32(m.Size),
			})
		}
		// Parse the flag's value as one or more triples (if it's even
		// been set), and append them.
		var spec []string
		if globalOptions.Lookup(option) != nil && globalOptions.Lookup(option).Changed {
			spec, _ = globalOptions.GetStringSlice(option)
		} else {
			spec, _ = flags.GetStringSlice(option)
		}

		idmap, err := parseIDMap(spec)
		if err != nil {
			return nil, err
		}
		for _, m := range idmap {
			outmap = append(outmap, specs.LinuxIDMapping{
				ContainerID: m[0],
				HostID:      m[1],
				Size:        m[2],
			})
		}
		return outmap, nil
	}
	uidmap, err := buildIDMap(mappings.UIDs(), "userns-uid-map")
	if err != nil {
		return nil, nil, err
	}
	gidmap, err := buildIDMap(mappings.GIDs(), "userns-gid-map")
	if err != nil {
		return nil, nil, err
	}
	// If we only have one map or the other populated at this point, then
	// use the same mapping for both, since we know that no user or group
	// name was specified, but a specific mapping was for one or the other.
	if len(uidmap) == 0 && len(gidmap) != 0 {
		uidmap = gidmap
	}
	if len(gidmap) == 0 && len(uidmap) != 0 {
		gidmap = uidmap
	}

	// By default, having mappings configured means we use a user
	// namespace.  Otherwise, we don't.
	usernsOption := define.NamespaceOption{
		Name: string(specs.UserNamespace),
		Host: len(uidmap) == 0 && len(gidmap) == 0,
	}
	// If the user specifically requested that we either use or don't use
	// user namespaces, override that default.

	how, _ := flags.GetString("userns")
	switch how {
	case "", "container", "private":
		usernsOption.Host = false
	case "host":
		usernsOption.Host = true
	default:
		how = strings.TrimPrefix(how, "ns:")
		if _, err := os.Stat(how); err != nil {
			return nil, nil, errors.Wrapf(err, "checking %s namespace", string(specs.UserNamespace))
		}
		logrus.Debugf("setting %q namespace to %q", string(specs.UserNamespace), how)
		usernsOption.Path = how
	}

	usernsOptions = define.NamespaceOptions{usernsOption}

	// If the user requested that we use the host namespace, but also that
	// we use mappings, that's not going to work.
	if (len(uidmap) != 0 || len(gidmap) != 0) && usernsOption.Host {
		return nil, nil, errors.Errorf("can not specify ID mappings while using host's user namespace")
	}
	return usernsOptions, &define.IDMappingOptions{
		HostUIDMapping: usernsOption.Host,
		HostGIDMapping: usernsOption.Host,
		UIDMap:         uidmap,
		GIDMap:         gidmap,
	}, nil
}

func parseIDMap(spec []string) (m [][3]uint32, err error) {
	for _, s := range spec {
		args := strings.FieldsFunc(s, func(r rune) bool { return !unicode.IsDigit(r) })
		if len(args)%3 != 0 {
			return nil, errors.Errorf("mapping %q is not in the form containerid:hostid:size[,...]", s)
		}
		for len(args) >= 3 {
			cid, err := strconv.ParseUint(args[0], 10, 32)
			if err != nil {
				return nil, errors.Wrapf(err, "error parsing container ID %q from mapping %q as a number", args[0], s)
			}
			hostid, err := strconv.ParseUint(args[1], 10, 32)
			if err != nil {
				return nil, errors.Wrapf(err, "error parsing host ID %q from mapping %q as a number", args[1], s)
			}
			size, err := strconv.ParseUint(args[2], 10, 32)
			if err != nil {
				return nil, errors.Wrapf(err, "error parsing %q from mapping %q as a number", args[2], s)
			}
			m = append(m, [3]uint32{uint32(cid), uint32(hostid), uint32(size)})
			args = args[3:]
		}
	}
	return m, nil
}

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

const (
	maxPullPushRetries = 3
	pullPushRetryDelay = 2 * time.Second
)

func openImage(ctx context.Context, sc *ct.SystemContext, store storage.Store, name string) (builder *buildah.Builder, err error) {
	options := buildah.ImportFromImageOptions{
		Image:         name,
		SystemContext: sc,
	}
	builder, err = buildah.ImportBuilderFromImage(ctx, store, options)
	if err != nil {
		return nil, err
	}
	if builder == nil {
		return nil, errors.Errorf("error mocking up build configuration")
	}
	return builder, nil
}

func manifestInspect(ctx context.Context, store storage.Store, systemContext *ct.SystemContext, imageSpec string) error {
	runtime, err := libimage.RuntimeFromStore(store, &libimage.RuntimeOptions{SystemContext: systemContext})
	if err != nil {
		return err
	}

	printManifest := func(manifest []byte) error {
		var b bytes.Buffer
		err = json.Indent(&b, manifest, "", "    ")
		if err != nil {
			return errors.Wrapf(err, "error rendering manifest for display")
		}

		fmt.Printf("%s\n", b.String())
		return nil
	}

	// Before doing a remote lookup, attempt to resolve the manifest list
	// locally.
	manifestList, err := runtime.LookupManifestList(imageSpec)
	switch errors.Cause(err) {
	case storage.ErrImageUnknown, libimage.ErrNotAManifestList:
		// We need to do the remote inspection below.
	case nil:
		schema2List, err := manifestList.Inspect()
		if err != nil {
			return err
		}

		rawSchema2List, err := json.Marshal(schema2List)
		if err != nil {
			return err
		}

		return printManifest(rawSchema2List)

	default:
		// Fatal error.
		return err
	}

	// TODO: at some point `libimage` should support resolving manifests
	// like that.  Similar to `libimage.Runtime.LookupImage` we could
	// implement a `*.LookupImageIndex`.
	refs, err := util.ResolveNameToReferences(store, systemContext, imageSpec)
	if err != nil {
		logrus.Debugf("error parsing reference to image %q: %v", imageSpec, err)
	}

	if ref, _, err := util.FindImage(store, "", systemContext, imageSpec); err == nil {
		refs = append(refs, ref)
	} else if ref, err := alltransports.ParseImageName(imageSpec); err == nil {
		refs = append(refs, ref)
	}
	if len(refs) == 0 {
		return errors.Errorf("error locating images with names %v", imageSpec)
	}

	var (
		latestErr error
		result    []byte
	)

	appendErr := func(e error) {
		if latestErr == nil {
			latestErr = e
		} else {
			latestErr = errors.Wrapf(latestErr, "tried %v", e)
		}
	}

	for _, ref := range refs {
		logrus.Debugf("Testing reference %q for possible manifest", transports.ImageName(ref))

		src, err := ref.NewImageSource(ctx, systemContext)
		if err != nil {
			appendErr(errors.Wrapf(err, "reading image %q", transports.ImageName(ref)))
			continue
		}
		defer src.Close()

		manifestBytes, manifestType, err := src.GetManifest(ctx, nil)
		if err != nil {
			appendErr(errors.Wrapf(err, "loading manifest %q", transports.ImageName(ref)))
			continue
		}

		if !manifest.MIMETypeIsMultiImage(manifestType) {
			appendErr(errors.Errorf("manifest is of type %s (not a list type)", manifestType))
			continue
		}
		result = manifestBytes
		break
	}
	if len(result) == 0 && latestErr != nil {
		return latestErr
	}

	return printManifest(result)
}
