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
	"fmt"
	"path"

	"github.com/spf13/pflag"

	"github.com/labring/sealos/pkg/constants"
)

type Cluster struct {
	Masters     string
	Nodes       string
	ClusterName string
}

func (c *Cluster) RegisterFlags(fs *pflag.FlagSet, verb, action string) {
	fs.StringVar(&c.Masters, "masters", "", fmt.Sprintf("masters to %s", verb))
	fs.StringVar(&c.Nodes, "nodes", "", fmt.Sprintf("nodes to %s", verb))
	fs.StringVar(&c.ClusterName, "cluster", "default", fmt.Sprintf("name of cluster to applied %s action", action))
}

type SSH struct {
	User       string
	Password   string
	Pk         string
	PkPassword string
	Port       uint16
}

func (s *SSH) RegisterFlags(fs *pflag.FlagSet) {
	fs.StringVarP(&s.User, "user", "u", "", "username to authenticate as")
	fs.StringVarP(&s.Password, "passwd", "p", "", "use given password to authenticate with")
	fs.StringVarP(&s.Pk, "pk", "i", path.Join(constants.GetHomeDir(), ".ssh", "id_rsa"),
		"selects a file from which the identity (private key) for public key authentication is read")
	fs.StringVar(&s.PkPassword, "pk-passwd", "", "passphrase for decrypting a PEM encoded private key")
	fs.Uint16Var(&s.Port, "port", 22, "port to connect to on the remote host")
}

type RunArgs struct {
	*Cluster
	*SSH
	CustomEnv         []string
	CustomCMD         []string
	CustomConfigFiles []string
	fs                *pflag.FlagSet
}

func (arg *RunArgs) RegisterFlags(fs *pflag.FlagSet) {
	arg.Cluster.RegisterFlags(fs, "run with", "run")
	arg.SSH.RegisterFlags(fs)
	fs.StringSliceVarP(&arg.CustomEnv, "env", "e", []string{}, "environment variables to set during command execution")
	fs.StringSliceVar(&arg.CustomCMD, "cmd", []string{}, "override CMD directive in images")
	fs.StringSliceVar(&arg.CustomConfigFiles, "config-file", []string{}, "path of custom config files, to use to replace the resource")
	arg.fs = fs
}

type Args struct {
	Values            []string
	Sets              []string
	CustomEnv         []string
	CustomConfigFiles []string
}

func (arg *Args) RegisterFlags(fs *pflag.FlagSet) {
	fs.StringSliceVar(&arg.Values, "values", []string{}, "values file to apply into Clusterfile")
	fs.StringSliceVar(&arg.Sets, "set", []string{}, "set values on the command line")
	fs.StringSliceVar(&arg.CustomEnv, "env", []string{}, "environment variables to set during command execution")
	fs.StringSliceVar(&arg.CustomConfigFiles, "config-file", []string{}, "path of custom config files, to use to replace the resource")
}

type ResetArgs struct {
	*Cluster
	*SSH
	fs *pflag.FlagSet
}

func (arg *ResetArgs) RegisterFlags(fs *pflag.FlagSet) {
	arg.Cluster.RegisterFlags(fs, "be reset", "reset")
	arg.SSH.RegisterFlags(fs)
	arg.fs = fs
}

type ScaleArgs struct {
	*Cluster
}

func (arg *ScaleArgs) RegisterFlags(fs *pflag.FlagSet, verb, action string) {
	arg.Cluster.RegisterFlags(fs, verb, action)
}
