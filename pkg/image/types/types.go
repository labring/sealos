/*
Copyright 2022 cuisongliu@qq.com.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

package types

import (
	"fmt"
	v1 "github.com/opencontainers/image-spec/specs-go/v1"
	"strings"
	"time"
)

type PullType string
type ImageListOCIV1 []v1.Image

const (
	PullTypeIfMissing PullType = "false"
	PullTypeIfNewer   PullType = "true"
	PullTypeAlways    PullType = "always"
	PullTypeNever     PullType = "never"
)

type BuildOptions struct {
	NoCache            bool     //--no-cache
	AllPlatforms       bool     //--all-platforms
	OS                 string   //--os "linux"
	Arch               string   //--arch "amd64"
	DisableCompression bool     //--disable-compression default true
	File               string   //--file -f
	ForceRemove        bool     //--force-rm
	Remove             bool     //--rm true
	Platform           string   //--platform linux/amd64
	Pull               PullType //--pull string[="true"] true  (true,always,never)
	Tag                string
}

func (opts *BuildOptions) Default() {
	opts.NoCache = false
	opts.AllPlatforms = false
	opts.DisableCompression = true
	opts.ForceRemove = false
	opts.Remove = true
	opts.Pull = PullTypeIfMissing
}

func (opts *BuildOptions) String() string {
	var sb strings.Builder
	if opts.NoCache {
		sb.WriteString(" --no-cache ")
	}
	if opts.AllPlatforms {
		sb.WriteString(" --all-platforms ")
	}
	if len(opts.OS) > 0 {
		sb.WriteString(fmt.Sprintf(" --os %s ", opts.OS))
	}
	if len(opts.Arch) > 0 {
		sb.WriteString(fmt.Sprintf(" --arch %s ", opts.Arch))
	}
	if !opts.DisableCompression {
		sb.WriteString(" --disable-compression=false ")
	}
	if len(opts.File) > 0 {
		sb.WriteString(fmt.Sprintf(" -f %s ", opts.File))
	}
	if opts.ForceRemove {
		sb.WriteString(" --force-rm ")
	}
	if !opts.Remove {
		sb.WriteString(" --rm=false ")
	}
	if len(opts.Platform) > 0 {
		sb.WriteString(fmt.Sprintf(" --platform %s ", opts.Platform))
	}
	if len(opts.Pull) > 0 {
		sb.WriteString(fmt.Sprintf(" --pull=%s ", string(opts.Pull)))
	}
	if len(opts.Tag) > 0 {
		sb.WriteString(fmt.Sprintf(" -t %s ", opts.Tag))
	}
	return sb.String()
}

type ClusterManifest struct {
	Container   string
	ContainerID string
	MountPoint  string
}

type ClusterInfo struct {
	ID            string `json:"id"`
	Builder       bool   `json:"builder"`
	Imageid       string `json:"imageid"`
	Imagename     string `json:"imagename"`
	Containername string `json:"containername"`
}

type ImageInfo struct {
	ID           string    `json:"id"`
	Names        []string  `json:"names"`
	Digest       string    `json:"digest"`
	CreatedAt    string    `json:"createdat"`
	Size         string    `json:"size"`
	Created      int64     `json:"created"`
	CreatedAtRaw time.Time `json:"createdatraw"`
	ReadOnly     bool      `json:"readonly"`
	History      []string  `json:"history"`
}
