// Copyright © 2023 sealos.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

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
