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

package boot

import (
	"github.com/fanux/sealos/pkg/utils/logger"
	"github.com/sealyun/lvscare/care"
	"github.com/spf13/pflag"
)

type CertFlag struct {
	AltNames     []string
	NodeName     string
	ServiceCIDR  string
	NodeIP       string
	DNSDomain    string
	CertPath     string
	CertEtcdPath string
}

type HostsFlag struct {
	HostsPath string
}

type RouteFlag struct {
	Host      string
	GatewayIP string
}

type StaticPodFlag struct {
	StaticPodPath string
}

type VersionFlag struct {
	ShortPrint bool
}

type CRIFlag struct {
	SocketPath string
	ConfigPath string
}

type RegistryImageFlag struct {
	Pull struct {
		RegistryDir string
		Auths       []string
		Arch        string
	}
}

type RootFlag struct {
	Debug     bool
	ConfigDir string
	ShowPatch bool
}

type Flag struct {
	Cert          CertFlag
	Hosts         HostsFlag
	Ipvs          care.LvsCare
	Route         RouteFlag
	StaticPod     StaticPodFlag
	Version       VersionFlag
	CRI           CRIFlag
	RegistryImage RegistryImageFlag
	Root          RootFlag
}

var CmdFlag Flag

// PrintFlags logs the flags in the flagset
func PrintFlags(flags *pflag.FlagSet) {
	flags.VisitAll(func(flag *pflag.Flag) {
		logger.Debug("FLAG: --%s=%q", flag.Name, flag.Value)
	})
}
