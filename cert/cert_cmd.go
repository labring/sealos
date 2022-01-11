// Copyright © 2021 sealos.
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

package cert

import (
	"fmt"
	"os"

	"github.com/fanux/sealos/pkg/logger"
)

// CMD return sealos cert command
func CMD(altNames []string, hostIP, hostName, serviceCIRD, DNSDomain string) string {
	cmd := "sealos cert "
	if hostIP != "" {
		cmd += fmt.Sprintf(" --node-ip %s", hostIP)
	}

	if hostName != "" {
		cmd += fmt.Sprintf(" --node-name %s", hostName)
	}

	if serviceCIRD != "" {
		cmd += fmt.Sprintf(" --service-cidr %s", serviceCIRD)
	}

	if DNSDomain != "" {
		cmd += fmt.Sprintf(" --dns-domain %s", DNSDomain)
	}

	for _, name := range altNames {
		if name != "" {
			cmd += fmt.Sprintf(" --alt-names %s", name)
		}
	}

	return cmd
}

// GenerateCert generate all cert.
func GenerateCert(certPATH, certEtcdPATH string, altNames []string, hostIP, hostName, serviceCIRD, DNSDomain string) {
	certConfig, err := NewSealosCertMetaData(certPATH, certEtcdPATH, altNames, serviceCIRD, hostName, hostIP, DNSDomain)
	if err != nil {
		logger.Error("generator cert config failed %s", err)
		os.Exit(-1)
	}
	err = certConfig.GenerateAll()
	if err != nil {
		logger.Error("GenerateAll err %s", err)
	}
}
