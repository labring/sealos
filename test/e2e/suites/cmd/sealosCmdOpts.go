package cmd

import (
	"strconv"
	"strings"

	"github.com/labring/sealos/pkg/types/v1beta1"
	"github.com/labring/sealos/pkg/utils/logger"
)

type CommandOptions interface {
	Args() []string
}

type RunOptions struct {
	Cluster    string
	Cmd        []string
	ConfigFile []string
	Env        []string
	Force      bool
	Masters    []string
	Nodes      []string
	Images     []string
	SSH        *v1beta1.SSH
	Single     bool
	Transport  string
}

type ApplyOptions struct {
	Clusterfile string
	ConfigFile  []string
	Env         []string
	Set         []string
	Values      []string
}

type AddOptions struct {
	Cluster string
	Masters []string
	Nodes   []string
}

type DeleteOptions struct {
	Cluster string
	Force   bool
	Masters []string
	Nodes   []string
}

type ResetOptions struct {
	Cluster string
	Force   bool
	Masters []string
	Nodes   []string
	SSH     *v1beta1.SSH
}

type CertOptions struct {
	Cluster string
	AltName []string
}

type BuildOptions struct {
	AllPlatforms       bool
	Authfile           string
	BuildContext       []string
	BuildArg           []string
	CertDir            string
	Compress           bool
	Creds              string
	DisableCompression bool
	DNS                string
	DNSOption          []string
	DNSSearch          []string
	Env                []string
	File               string
	ForceRm            bool
	Format             string
	From               string
	HttpProxy          bool
	Ignorefile         string
	Jobs               int
	Label              []string
	Manifest           string
	MaxPullProcs       int
	Platform           string
	Pull               string
	Quiet              bool
	Retry              int
	RetryDelay         string
	Rm                 bool
	SaveImage          bool
	ShmSize            string
	Tag                string
}

type CreateOptions struct {
	Cluster  string
	Platform string
	Short    bool
}

func (ro *RunOptions) Args() []string {
	if ro.SSH == nil {
		ro.SSH = &v1beta1.SSH{}
	}
	var args Args = []string{}
	return args.appendFlagsWithValues("--cluster", ro.Cluster).
		appendFlagsWithValues("--masters", strings.Join(ro.Masters, ",")).
		appendFlagsWithValues("--nodes", strings.Join(ro.Nodes, ",")).
		appendFlagsWithValues("", ro.Images).
		appendFlagsWithValues("--cmd", ro.Cmd).
		appendFlagsWithValues("--env", ro.Env).
		appendFlagsWithValues("--config-file", ro.ConfigFile).
		appendFlagsWithValues("--user", ro.SSH.User).
		appendFlagsWithValues("--passwd", ro.SSH.Passwd).
		appendFlagsWithValues("--pk", ro.SSH.Pk).
		appendFlagsWithValues("--pk-passwd", ro.SSH.PkPasswd).
		appendFlagsWithValues("--port", ro.SSH.Port).
		appendFlagsWithValues("--transport", ro.Transport)
}

func (ro *ApplyOptions) Args() []string {
	var args Args = []string{}
	return args.appendFlagsWithValues("--clusterfile", ro.Clusterfile).
		appendFlagsWithValues("--config-file", ro.ConfigFile).
		appendFlagsWithValues("--env", ro.Env).
		appendFlagsWithValues("--set", ro.Set).
		appendFlagsWithValues("--values", ro.Values)
}

type Args []string

func (ao *AddOptions) Args() []string {
	var args Args = []string{}
	return args.appendFlagsWithValues("--masters", strings.Join(ao.Masters, ",")).
		appendFlagsWithValues("--nodes", strings.Join(ao.Nodes, ",")).
		appendFlagsWithValues("--cluster", ao.Cluster)
}

func (bo *BuildOptions) Args() []string {
	var args Args = []string{}
	return args.appendFlagsWithValues("--build-arg", bo.BuildArg).
		appendFlagsWithValues("--build-context", bo.BuildContext).
		appendFlagsWithValues("--cert-dir", bo.CertDir).
		appendFlagsWithValues("--compress", bo.Compress).
		appendFlagsWithValues("--creds", bo.Creds).
		appendFlagsWithValues("--disable-compression", bo.DisableCompression).
		appendFlagsWithValues("--dns", bo.DNS).
		appendFlagsWithValues("--dns-option", bo.DNSOption).
		appendFlagsWithValues("--dns-search", bo.DNSSearch).
		appendFlagsWithValues("--env", bo.Env).
		appendFlagsWithValues("--file", bo.File).
		appendFlagsWithValues("--force-rm", bo.ForceRm).
		appendFlagsWithValues("--format", bo.Format).
		appendFlagsWithValues("--from", bo.From).
		appendFlagsWithValues("--http-proxy", bo.HttpProxy).
		appendFlagsWithValues("--ignorefile", bo.Ignorefile).
		appendFlagsWithValues("--jobs", bo.Jobs).
		appendFlagsWithValues("--label", bo.Label).
		appendFlagsWithValues("--manifest", bo.Manifest).
		appendFlagsWithValues("--max-pull-procs", bo.MaxPullProcs).
		appendFlagsWithValues("--platform", bo.Platform).
		appendFlagsWithValues("--pull", bo.Pull).
		appendFlagsWithValues("--quiet", bo.Quiet).
		appendFlagsWithValues("--retry", bo.Retry).
		appendFlagsWithValues("--retry-delay", bo.RetryDelay).
		appendFlagsWithValues("--rm", bo.Rm).
		appendFlagsWithValues("--save-image", bo.SaveImage).
		appendFlagsWithValues("--shm-size", bo.ShmSize).
		appendFlagsWithValues("--tag", bo.Tag)
}

func (co *CreateOptions) Args() []string {
	var args Args = []string{}
	return args.appendFlagsWithValues("--cluster", co.Cluster).
		appendFlagsWithValues("--platform", co.Platform).
		appendFlagsWithValues("--short", co.Short)
}

func (do *DeleteOptions) Args() []string {
	var args Args = []string{}
	return args.appendFlagsWithValues("--cluster", do.Cluster).
		appendFlagsWithValues("--force", do.Force).
		appendFlagsWithValues("--masters", strings.Join(do.Masters, ",")).
		appendFlagsWithValues("--nodes", strings.Join(do.Nodes, ","))
}

func (ro *ResetOptions) Args() []string {
	if ro.SSH == nil {
		ro.SSH = &v1beta1.SSH{}
	}
	var args Args = []string{}
	return args.appendFlagsWithValues("--cluster", ro.Cluster).
		appendFlagsWithValues("--force", ro.Force).
		appendFlagsWithValues("--masters", strings.Join(ro.Masters, ",")).
		appendFlagsWithValues("--nodes", strings.Join(ro.Nodes, ",")).
		appendFlagsWithValues("--user", ro.SSH.User).
		appendFlagsWithValues("--passwd", ro.SSH.Passwd).
		appendFlagsWithValues("--pk", ro.SSH.Pk).
		appendFlagsWithValues("--pk-passwd", ro.SSH.PkPasswd).
		appendFlagsWithValues("--port", ro.SSH.Port)
}

func (co *CertOptions) Args() []string {
	var args Args = []string{}
	return args.appendFlagsWithValues("--cluster", co.Cluster).
		appendFlagsWithValues("--alt-names", strings.Join(co.AltName, ","))
}

func (args Args) appendFlagsWithValues(flagName string, values interface{}) Args {
	switch vv := values.(type) {
	case []string:
		if vv == nil {
			return args
		}
		for _, v := range vv {
			if flagName != "" {
				args = append(args, flagName)
			}
			args = append(args, v)
		}
	case string:
		if vv == "" {
			return args
		}
		if flagName != "" {
			args = append(args, flagName)
		}
		args = append(args, vv)
	case bool:
		if vv {
			if flagName != "" {
				args = append(args, flagName)
			}
		}
	case uint16:
		if vv == 0 {
			return args
		}
		if flagName != "" {
			args = append(args, flagName)
		}
		args = append(args, strconv.Itoa(int(vv)))
	default:
		logger.Error("Unsupported %s type %T", flagName, vv)
	}
	return args
}
