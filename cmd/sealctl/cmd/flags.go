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

package cmd

import "github.com/sealyun/lvscare/care"

type Flag struct {
	Cert struct {
		AltNames     []string
		NodeName     string
		ServiceCIDR  string
		NodeIP       string
		DNSDomain    string
		CertPath     string
		CertEtcdPath string
	}
	Hosts struct {
		HostsPath string
	}
	Ipvs  care.LvsCare
	Route struct {
		host      string
		gatewayIP string
	}
	StaticPod struct {
		staticPodPath string
	}
	Version struct {
		shortPrint bool
	}
	CRI struct {
		socketPath string
		configPath string
	}
	Images struct {
		RegistryPath   string
		AuthConfigFile string
	}
}

var flag Flag
