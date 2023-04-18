package cmd

import (
	"time"
)

// ImagesOptions sealos images pull/push options
type PullOptions struct {
	AllTags          bool
	AuthFile         string
	CertDir          string
	Creds            string
	DecryptionKey    []string
	Platform         string
	Policy           string
	Quiet            bool
	RemoveSignatures bool
	Retry            uint
	RetryDelay       time.Duration
	ImageRefs        []string
}

type MergeOptions struct {
	Quiet        bool
	Tag          []string
	ImageRefs    []string
	AuthFile     string
	AllPlatforms bool
	//BuildArg           []string
	//BuildContext       []string
	//CertDir            string
	//Compress           bool
	//Creds              string
	//DisableCompression bool
	//Dns                []string
	//DnsOption          []string
	//DnsSearch          []string
	//Env                []string
	//File               []string
	//ForceRm            bool
	//Format             string
	//From               string
	//GroupAdd           []string
	//HttpProxy          bool
	//IgnoreFile         string
	//Jobs               int
	//Label              []string
	//Manifest           string
	//MaxPullProcs       int
	//Platform           string
	//Pull               string
	//Retry              int
	//RetryDelay         time.Duration
	//Rm                 bool
	//ShmSize            string
}

func (po *PullOptions) Args() []string {
	var args Args = []string{}
	return args.appendFlagsWithValues("-a", po.AllTags).
		appendFlagsWithValues("-q", po.Quiet).
		appendFlagsWithValues("", po.ImageRefs)
}

func (mo *MergeOptions) Args() []string {
	var args Args = []string{}
	return args.appendFlagsWithValues("-q", mo.Quiet).
		appendFlagsWithValues("-t", mo.Tag).
		appendFlagsWithValues("", mo.ImageRefs)
}
