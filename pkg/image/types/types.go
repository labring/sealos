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
	"runtime"
	"strings"
	"time"

	"github.com/containers/buildah/pkg/cli"
	v1 "github.com/opencontainers/image-spec/specs-go/v1"
)

type PullType string
type ImageListOCIV1 []v1.Image
type ClusterManifestList []ClusterManifest

const (
	PullTypeIfMissing PullType = "false"
	PullTypeIfNewer   PullType = "true"
	PullTypeAlways    PullType = "always"
	PullTypeNever     PullType = "never"
)

const (
	OCIArchive    string = "oci-archive"
	DockerArchive string = "docker-archive"
)

const (
	PullPolicyMissing = "missing" // processor  create, install, command merge, create, save
	PullPloicyAlways  = "always"
	PullPloicyNever   = "never"
	PullPloicyIfnewer = "ifnewer" // command pull
)

var DefaultTransport = OCIArchive

type BuildOptions struct {
	NoCache            bool     //--no-cache
	AllPlatforms       bool     //--all-platforms
	DisableCompression bool     //--disable-compression default true
	File               string   //--file -f
	ForceRemove        bool     //--force-rm
	Remove             bool     //--rm true
	Platform           string   //--platform linux/amd64
	Pull               PullType //--pull string[="true"] true  (true,always,never)
	MaxPullProcs       int      //--max-pull-procs
	SaveImage          bool
	Tag                string
}

func (opts *BuildOptions) String() string {
	opts.AllPlatforms = false
	opts.DisableCompression = true
	opts.Pull = PullTypeIfMissing
	if opts.Platform == "" {
		opts.Platform = fmt.Sprintf("%s/%s", runtime.GOOS, runtime.GOARCH)
	}
	var sb strings.Builder
	if opts.NoCache {
		sb.WriteString(" --no-cache ")
	}
	if opts.AllPlatforms {
		sb.WriteString(" --all-platforms ")
	}
	if !opts.DisableCompression {
		sb.WriteString(" --disable-compression=false ")
	}
	if len(opts.File) > 0 {
		sb.WriteString(fmt.Sprintf(" -f %s ", opts.File))
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

type JSONImage struct {
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

type ImageResults struct {
	Names []string
	ImageOptions
	Filter []string
}

type InspectResults struct {
	Format      string
	InspectType string
}

type ImageOptions struct {
	All       bool
	Digests   bool
	Format    string
	JSON      bool
	NoHeading bool
	Truncate  bool
	Quiet     bool
	ReadOnly  bool
	History   bool
}
type ImageOutputParams struct {
	Tag          string
	ID           string
	Name         string
	Digest       string
	Created      int64
	CreatedAt    string
	Size         string
	CreatedAtRaw time.Time
	ReadOnly     bool
	History      string
}
type PullOptions struct {
	AllTags          bool
	Authfile         string
	BlobCache        string
	CertDir          string
	Creds            string
	SignaturePolicy  string
	Quiet            bool
	RemoveSignatures bool
	TLSVerify        bool
	DecryptionKeys   []string
	PullPolicy       string
	OS               string
	Arch             string
	Platform         []string
	Variant          string
}

type GlobalBuildahFlags struct {
	Debug                      bool
	LogLevel                   string
	Root                       string
	RunRoot                    string
	StorageDriver              string
	RegistriesConf             string
	RegistriesConfDir          string
	DefaultMountsFile          string
	StorageOpts                []string
	UserNSUID                  []string
	UserNSGID                  []string
	CPUProfile                 string
	MemoryProfile              string
	UserShortNameAliasConfPath string
	CgroupManager              string
}

type PushOptions struct {
	All                bool
	Authfile           string
	BlobCache          string
	CertDir            string
	Creds              string
	Digestfile         string
	DisableCompression bool
	Format             string
	CompressionFormat  string
	CompressionLevel   int
	Rm                 bool
	Quiet              bool
	RemoveSignatures   bool
	SignaturePolicy    string
	SignBy             string
	TLSVerify          bool
	EncryptionKeys     []string
	EncryptLayers      []int
}

type RmiOptions struct {
	All   bool
	Prune bool
	Force bool
}

type BuildahBuildOptions struct {
	*cli.LayerResults
	*cli.BudResults
	*cli.UserNSResults
	*cli.FromAndBudResults
	*cli.NameSpaceResults
}

func DefaultPlatform() v1.Platform {
	return v1.Platform{
		Architecture: runtime.GOARCH,
		OS:           runtime.GOOS,
	}
}

func ParsePlatform(platform string) v1.Platform {
	platformList := strings.Split(platform, "/")
	var platformVar v1.Platform
	if len(platformList) > 2 {
		platformVar = v1.Platform{
			Architecture: platformList[1],
			OS:           platformList[0],
			Variant:      platformList[2],
		}
	} else {
		platformVar = v1.Platform{
			Architecture: platformList[1],
			OS:           platformList[0],
		}
	}
	return platformVar
}
