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

package apply

import (
	"bytes"
	"encoding/json"
	"path"
	"strings"
	"testing"

	"github.com/spf13/pflag"

	"github.com/labring/sealos/pkg/constants"
)

func TestParseClusterFlagsCorrect(t *testing.T) {
	var tests = []struct {
		args    []string
		flags   *Cluster
		desired *Cluster
	}{
		{
			[]string{"--masters", "10.74.22.22:22", "--nodes", "10.74.22.44:22", "--cluster", "default"},
			&Cluster{},
			&Cluster{Masters: "10.74.22.22:22", Nodes: "10.74.22.44:22", ClusterName: "default"},
		},
	}

	for _, tt := range tests {
		t.Run(strings.Join(tt.args, " "), func(t *testing.T) {
			fs := pflag.NewFlagSet("test", pflag.ExitOnError)
			tt.flags.RegisterFlags(fs, "test", "test")
			err := fs.Parse(tt.args)
			if err != nil {
				t.Errorf("parse flag error: %v", err)
			}
			if !equal(tt.flags, tt.desired) {
				t.Errorf("cluster got %+v, want %+v", tt.flags, tt.desired)
			}
		})
	}
}

func TestParseSSHFlagsCorrect(t *testing.T) {
	var tests = []struct {
		args    []string
		flags   *SSH
		desired *SSH
	}{
		{
			[]string{"-u", "root", "-p", "s3cret", "--port", "2222"},
			&SSH{},
			&SSH{User: "root", Password: "s3cret", Port: 2222, Pk: path.Join(constants.GetHomeDir(), ".ssh", "id_rsa")},
		},
	}

	for _, tt := range tests {
		t.Run(strings.Join(tt.args, " "), func(t *testing.T) {
			fs := pflag.NewFlagSet("test", pflag.ExitOnError)
			tt.flags.RegisterFlags(fs)
			err := fs.Parse(tt.args)
			if err != nil {
				t.Errorf("parse flag error: %v", err)
			}
			if !equal(tt.flags, tt.desired) {
				t.Errorf("cluster got %+v, want %+v", tt.flags, tt.desired)
			}
		})
	}
}

func equal(in, out interface{}) bool {
	inByte, _ := json.Marshal(&in)
	outByte, _ := json.Marshal(&out)
	return bytes.Equal(inByte, outByte)
}

func TestParseRunArgsFlagsCorrect(t *testing.T) {
	var tests = []struct {
		args    []string
		flags   *RunArgs
		desired *RunArgs
	}{
		{
			[]string{
				"--masters", "10.74.22.22:22", "--nodes", "10.74.22.44:22", "--cluster", "default",
				"-u", "root", "-p", "s3cret", "--port", "2222",
				"--env", "testk=testv",
				"--cmd", "echo test",
			},
			&RunArgs{
				Cluster: &Cluster{},
				SSH:     &SSH{},
			},
			&RunArgs{
				Cluster:           &Cluster{Masters: "10.74.22.22:22", Nodes: "10.74.22.44:22", ClusterName: "default"},
				SSH:               &SSH{User: "root", Password: "s3cret", Port: 2222, Pk: path.Join(constants.GetHomeDir(), ".ssh", "id_rsa")},
				CustomEnv:         []string{"testk=testv"},
				CustomCMD:         []string{"echo test"},
				CustomConfigFiles: []string{},
			},
		},
	}

	for _, tt := range tests {
		t.Run(strings.Join(tt.args, " "), func(t *testing.T) {
			fs := pflag.NewFlagSet("test", pflag.ExitOnError)
			tt.flags.RegisterFlags(fs)
			err := fs.Parse(tt.args)
			if err != nil {
				t.Errorf("parse flag error: %v", err)
			}
			if !equal(tt.flags, tt.desired) {
				t.Errorf("cluster got %+v, want %+v", tt.flags, tt.desired)
			}
		})
	}
}

func TestParseArgsFlagsCorrect(t *testing.T) {
	var tests = []struct {
		args    []string
		flags   *Args
		desired *Args
	}{
		{
			[]string{
				"--values", "test.yaml", "--set", "test.enabled=true", "--env", "testk=testv",
			},
			&Args{},
			&Args{
				Values:            []string{"test.yaml"},
				CustomEnv:         []string{"testk=testv"},
				Sets:              []string{"test.enabled=true"},
				CustomConfigFiles: []string{},
			},
		},
	}

	for _, tt := range tests {
		t.Run(strings.Join(tt.args, " "), func(t *testing.T) {
			fs := pflag.NewFlagSet("test", pflag.ExitOnError)
			tt.flags.RegisterFlags(fs)
			err := fs.Parse(tt.args)
			if err != nil {
				t.Errorf("parse flag error: %v", err)
			}
			if !equal(tt.flags, tt.desired) {
				t.Errorf("cluster got %+v, want %+v", tt.flags, tt.desired)
			}
		})
	}
}

func TestParseResetArgsFlagsCorrect(t *testing.T) {
	var tests = []struct {
		args    []string
		flags   *ResetArgs
		desired *ResetArgs
	}{
		{
			[]string{
				"--masters", "10.74.22.22:22", "--nodes", "10.74.22.44:22", "--cluster", "default",
				"-u", "root", "-p", "s3cret", "--port", "2222",
			},
			&ResetArgs{
				Cluster: &Cluster{},
				SSH:     &SSH{},
			},
			&ResetArgs{
				Cluster: &Cluster{Masters: "10.74.22.22:22", Nodes: "10.74.22.44:22", ClusterName: "default"},
				SSH:     &SSH{User: "root", Password: "s3cret", Port: 2222, Pk: path.Join(constants.GetHomeDir(), ".ssh", "id_rsa")},
			},
		},
	}

	for _, tt := range tests {
		t.Run(strings.Join(tt.args, " "), func(t *testing.T) {
			fs := pflag.NewFlagSet("test", pflag.ExitOnError)
			tt.flags.RegisterFlags(fs)
			err := fs.Parse(tt.args)
			if err != nil {
				t.Errorf("parse flag error: %v", err)
			}
			if !equal(tt.flags, tt.desired) {
				t.Errorf("cluster got %+v, want %+v", tt.flags, tt.desired)
			}
		})
	}
}

func TestParseScaleArgsFlagsCorrect(t *testing.T) {
	var tests = []struct {
		args    []string
		flags   *ScaleArgs
		desired *ScaleArgs
	}{
		{
			[]string{
				"--masters", "10.74.22.22:22", "--nodes", "10.74.22.44:22", "--cluster", "default",
			},
			&ScaleArgs{
				Cluster: &Cluster{},
			},
			&ScaleArgs{
				Cluster: &Cluster{Masters: "10.74.22.22:22", Nodes: "10.74.22.44:22", ClusterName: "default"},
			},
		},
	}

	for _, tt := range tests {
		t.Run(strings.Join(tt.args, " "), func(t *testing.T) {
			fs := pflag.NewFlagSet("test", pflag.ExitOnError)
			tt.flags.RegisterFlags(fs, "scale", "scale")
			err := fs.Parse(tt.args)
			if err != nil {
				t.Errorf("parse flag error: %v", err)
			}
			if !equal(tt.flags, tt.desired) {
				t.Errorf("cluster got %+v, want %+v", tt.flags, tt.desired)
			}
		})
	}
}
