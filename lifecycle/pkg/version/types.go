/*
Copyright 2014 The Kubernetes Authors.

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

package version

import (
	"fmt"
)

// Info contains versioning information.
// TODO: Add []string of api versions supported? It's still unclear
// how we'll want to distribute that information.
type Info struct {
	GitVersion string `json:"gitVersion" yaml:"gitVersion"`
	GitCommit  string `json:"gitCommit,omitempty" yaml:"gitCommit,omitempty"`
	BuildDate  string `json:"buildDate" yaml:"buildDate"`
	GoVersion  string `json:"goVersion" yaml:"goVersion"`
	Compiler   string `json:"compiler" yaml:"compiler"`
	Platform   string `json:"platform" yaml:"platform"`
}

// String returns info as a human-friendly version string.
func (info Info) String() string {
	return fmt.Sprintf("%s-%s", info.GitVersion, info.GitCommit)
}

type Output struct {
	SealosVersion     Info               `json:"SealosVersion,omitempty" yaml:"SealosVersion,omitempty"`
	CriRuntimeVersion *CriRuntimeVersion `json:"CriVersionInfo,omitempty" yaml:"CriVersionInfo,omitempty"`
	KubernetesVersion *KubernetesVersion `json:"KubernetesVersionInfo,omitempty" yaml:"KubernetesVersionInfo,omitempty"`
}

type CriRuntimeVersion struct {
	// Version of the kubelet runtime API.
	Version string `json:"Version,omitempty" yaml:"Version,omitempty"`
	// Name of the container runtime.
	RuntimeName string `json:"RuntimeName,omitempty" yaml:"RuntimeName,omitempty"`
	// Version of the container runtime. The string must be
	// semver-compatible.
	RuntimeVersion string `json:"RuntimeVersion,omitempty" yaml:"RuntimeVersion,omitempty"`
	// API version of the container runtime. The string must be
	// semver-compatible.
	RuntimeAPIVersion string `json:"RuntimeApiVersion,omitempty" yaml:"RuntimeApiVersion,omitempty"`
}

// Version is a struct for version information
type KubernetesVersion struct {
	ClientVersion    *KubectlInfo `json:"clientVersion,omitempty" yaml:"clientVersion,omitempty"`
	KustomizeVersion string       `json:"kustomizeVersion,omitempty" yaml:"kustomizeVersion,omitempty"`
	ServerVersion    *KubectlInfo `json:"serverVersion,omitempty" yaml:"serverVersion,omitempty"`
}

type KubectlInfo struct {
	Major        string `json:"major" yaml:"major"`
	Minor        string `json:"minor" yaml:"minor"`
	GitVersion   string `json:"gitVersion" yaml:"gitVersion"`
	GitCommit    string `json:"gitCommit" yaml:"gitCommit"`
	GitTreeState string `json:"gitTreeState" yaml:"gitTreeState"`
	BuildDate    string `json:"buildDate" yaml:"buildDate"`
	GoVersion    string `json:"goVersion" yaml:"goVersion"`
	Compiler     string `json:"compiler" yaml:"compiler"`
	Platform     string `json:"platform" yaml:"platform"`
}
