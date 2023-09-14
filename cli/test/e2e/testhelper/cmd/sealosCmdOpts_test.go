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
	"reflect"
	"testing"

	"github.com/labring/sealos/pkg/utils/logger"

	"github.com/labring/sealos/pkg/types/v1beta1"
)

func TestAddOptions_Args(t *testing.T) {
	type fields struct {
		Cluster string
		Masters []string
		Nodes   []string
	}
	tests := []struct {
		name   string
		fields fields
		want   []string
	}{
		// TODO: Add test cases.
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ao := &AddOptions{
				Cluster: tt.fields.Cluster,
				Masters: tt.fields.Masters,
				Nodes:   tt.fields.Nodes,
			}
			if got := ao.Args(); !reflect.DeepEqual(got, tt.want) {
				t.Errorf("Args() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestApplyOptions_Args(t *testing.T) {
	type fields struct {
		Clusterfile string
		ConfigFile  []string
		Env         []string
		Set         []string
		Values      []string
	}
	tests := []struct {
		name   string
		fields fields
		want   []string
	}{
		// TODO: Add test cases.
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ro := &ApplyOptions{
				Clusterfile: tt.fields.Clusterfile,
				ConfigFile:  tt.fields.ConfigFile,
				Env:         tt.fields.Env,
				Set:         tt.fields.Set,
				Values:      tt.fields.Values,
			}
			if got := ro.Args(); !reflect.DeepEqual(got, tt.want) {
				t.Errorf("Args() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestArgs_appendFlagsWithValues(t *testing.T) {
	type args struct {
		flagName string
		values   interface{}
	}
	tests := []struct {
		name  string
		args1 Args
		args  args
		want  Args
	}{
		// TODO: Add test cases.
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := tt.args1.appendFlagsWithValues(tt.args.flagName, tt.args.values); !reflect.DeepEqual(got, tt.want) {
				t.Errorf("appendFlagsWithValues() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestBuildOptions_Args(t *testing.T) {
	type fields struct {
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
		HTTPProxy          bool
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
	tests := []struct {
		name   string
		fields fields
		want   []string
	}{
		// TODO: Add test cases.
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			bo := &BuildOptions{
				AllPlatforms:       tt.fields.AllPlatforms,
				Authfile:           tt.fields.Authfile,
				BuildContext:       tt.fields.BuildContext,
				BuildArg:           tt.fields.BuildArg,
				CertDir:            tt.fields.CertDir,
				Creds:              tt.fields.Creds,
				DisableCompression: tt.fields.DisableCompression,
				DNS:                tt.fields.DNS,
				DNSOption:          tt.fields.DNSOption,
				DNSSearch:          tt.fields.DNSSearch,
				Env:                tt.fields.Env,
				File:               tt.fields.File,
				ForceRm:            tt.fields.ForceRm,
				Format:             tt.fields.Format,
				From:               tt.fields.From,
				HTTPProxy:          tt.fields.HTTPProxy,
				Ignorefile:         tt.fields.Ignorefile,
				Jobs:               tt.fields.Jobs,
				Label:              tt.fields.Label,
				Manifest:           tt.fields.Manifest,
				MaxPullProcs:       tt.fields.MaxPullProcs,
				Platform:           tt.fields.Platform,
				Pull:               tt.fields.Pull,
				Quiet:              tt.fields.Quiet,
				Retry:              tt.fields.Retry,
				RetryDelay:         tt.fields.RetryDelay,
				Rm:                 tt.fields.Rm,
				SaveImage:          tt.fields.SaveImage,
				ShmSize:            tt.fields.ShmSize,
				Tag:                tt.fields.Tag,
			}
			if got := bo.Args(); !reflect.DeepEqual(got, tt.want) {
				t.Errorf("Args() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestCertOptions_Args(t *testing.T) {
	type fields struct {
		Cluster string
		AltName []string
	}
	tests := []struct {
		name   string
		fields fields
		want   []string
	}{
		// TODO: Add test cases.
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			co := &CertOptions{
				Cluster: tt.fields.Cluster,
				AltName: tt.fields.AltName,
			}
			if got := co.Args(); !reflect.DeepEqual(got, tt.want) {
				t.Errorf("Args() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestCreateOptions_Args(t *testing.T) {
	type fields struct {
		Cluster  string
		Platform string
		Short    bool
	}
	tests := []struct {
		name   string
		fields fields
		want   []string
	}{
		// TODO: Add test cases.
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			co := &CreateOptions{
				Cluster:  tt.fields.Cluster,
				Platform: tt.fields.Platform,
				Short:    tt.fields.Short,
			}
			if got := co.Args(); !reflect.DeepEqual(got, tt.want) {
				t.Errorf("Args() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestDeleteOptions_Args(t *testing.T) {
	type fields struct {
		Cluster string
		Force   bool
		Masters []string
		Nodes   []string
	}
	tests := []struct {
		name   string
		fields fields
		want   []string
	}{
		// TODO: Add test cases.
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			do := &DeleteOptions{
				Cluster: tt.fields.Cluster,
				Force:   tt.fields.Force,
				Masters: tt.fields.Masters,
				Nodes:   tt.fields.Nodes,
			}
			if got := do.Args(); !reflect.DeepEqual(got, tt.want) {
				t.Errorf("Args() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestResetOptions_Args(t *testing.T) {
	type fields struct {
		Cluster string
		Force   bool
		Masters []string
		Nodes   []string
		SSH     *v1beta1.SSH
	}
	tests := []struct {
		name   string
		fields fields
		want   []string
	}{
		// TODO: Add test cases.
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ro := &ResetOptions{
				Cluster: tt.fields.Cluster,
				Force:   tt.fields.Force,
				Masters: tt.fields.Masters,
				Nodes:   tt.fields.Nodes,
				SSH:     tt.fields.SSH,
			}
			if got := ro.Args(); !reflect.DeepEqual(got, tt.want) {
				t.Errorf("Args() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestRunOptions_Args(t *testing.T) {
	type fields struct {
		Cluster    string
		Cmd        []string
		ConfigFile []string
		Env        []string
		Force      bool
		Masters    []string
		Nodes      []string
		Images     []string
		SSH        *v1beta1.SSH
		Transport  string
	}
	tests := []struct {
		name   string
		fields fields
		want   []string
	}{
		// TODO: Add test cases.
		{
			name: "test",
			fields: fields{
				Cluster:    "test-cluster",
				Cmd:        []string{"echo", "hello"},
				ConfigFile: []string{"test"},
				Env:        []string{"test"},
				Force:      true,
				Masters:    []string{"ip1", "ip2"},
				Nodes:      []string{"ip3", "ip4"},
				Images:     []string{"testimage1", "testimage2", "testimage3"},
				SSH: &v1beta1.SSH{
					User: "user",
					Port: 22,
					Pk:   "test-pk",
				},
				Transport: "test-transport",
			},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ro := &RunOptions{
				Cluster:    tt.fields.Cluster,
				Cmd:        tt.fields.Cmd,
				ConfigFile: tt.fields.ConfigFile,
				Env:        tt.fields.Env,
				Force:      tt.fields.Force,
				Masters:    tt.fields.Masters,
				Nodes:      tt.fields.Nodes,
				Images:     tt.fields.Images,
				SSH:        tt.fields.SSH,
				Transport:  tt.fields.Transport,
			}
			logger.Info(ro.Args())
			if got := ro.Args(); !reflect.DeepEqual(got, tt.want) {
				t.Errorf("Args() = %v, want %v", got, tt.want)
			}
		})
	}
}
