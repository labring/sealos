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

package cmd

import (
	"os"

	"github.com/spf13/cobra"

	"github.com/labring/sealos/pkg/cert"
	"github.com/labring/sealos/pkg/utils/flags"
	"github.com/labring/sealos/pkg/utils/logger"
)

func newCertCmd() *cobra.Command {
	type certFlag struct {
		AltNames     []string
		NodeName     string
		ServiceCIDR  string
		NodeIP       string
		DNSDomain    string
		CertPath     string
		CertEtcdPath string
	}
	var flag certFlag

	certCmd := &cobra.Command{
		Use:   "cert",
		Short: "generate certs",
		Long:  `you can specify expire time`,
		Run: func(cmd *cobra.Command, args []string) {
			flags.PrintFlags(cmd.Flags())
			err := cert.GenerateCert(flag.CertPath, flag.CertEtcdPath, flag.AltNames, flag.NodeIP, flag.NodeName, flag.ServiceCIDR, flag.DNSDomain)
			if err != nil {
				logger.Error(err)
				os.Exit(1)
			}
		},
	}
	certCmd.Flags().StringSliceVar(&flag.AltNames, "alt-names", []string{}, "like sealos.io or 10.103.97.2")
	certCmd.Flags().StringVar(&flag.NodeName, "node-name", "", "like master0")
	certCmd.Flags().StringVar(&flag.ServiceCIDR, "service-cidr", "", "like 10.103.97.2/24")
	certCmd.Flags().StringVar(&flag.NodeIP, "node-ip", "", "like 10.103.97.2")
	certCmd.Flags().StringVar(&flag.DNSDomain, "dns-domain", "cluster.local", "cluster dns domain")
	certCmd.Flags().StringVar(&flag.CertPath, "cert-path", "/etc/kubernetes/pki", "kubernetes cert file path")
	certCmd.Flags().StringVar(&flag.CertEtcdPath, "cert-etcd-path", "/etc/kubernetes/pki/etcd", "kubernetes etcd cert file path")

	return certCmd
}
