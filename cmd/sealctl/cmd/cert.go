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
	"github.com/fanux/sealos/pkg/utils/kubernetes/cert"
	"github.com/fanux/sealos/pkg/utils/logger"
	"github.com/spf13/cobra"
	"os"
)

type Flag struct {
	AltNames     []string
	NodeName     string
	ServiceCIDR  string
	NodeIP       string
	DNSDomain    string
	CertPath     string
	CertEtcdPath string
}

var config *Flag

// certCmd represents the cert command
var certCmd = &cobra.Command{
	Use:   "cert",
	Short: "generate certs",
	Long:  `you can specify expire time`,
	Run: func(cmd *cobra.Command, args []string) {
		err := cert.GenerateCert(config.CertPath, config.CertEtcdPath, config.AltNames, config.NodeIP, config.NodeName, config.ServiceCIDR, config.DNSDomain)
		if err != nil {
			logger.Error(err)
			os.Exit(-1)
		}
	},
}

func init() {
	config = &Flag{}
	rootCmd.AddCommand(certCmd)

	certCmd.Flags().StringSliceVar(&config.AltNames, "alt-names", []string{}, "like sealyun.com or 10.103.97.2")
	certCmd.Flags().StringVar(&config.NodeName, "node-name", "", "like master0")
	certCmd.Flags().StringVar(&config.ServiceCIDR, "service-cidr", "", "like 10.103.97.2/24")
	certCmd.Flags().StringVar(&config.NodeIP, "node-ip", "", "like 10.103.97.2")
	certCmd.Flags().StringVar(&config.DNSDomain, "dns-domain", "cluster.local", "cluster dns domain")
	certCmd.Flags().StringVar(&config.CertPath, "cert-path", "/etc/kubernetes/pki", "kubernetes cert file path")
	certCmd.Flags().StringVar(&config.CertEtcdPath, "cert-etcd-path", "/etc/kubernetes/pki/etcd", "kubernetes etcd cert file path")
}
