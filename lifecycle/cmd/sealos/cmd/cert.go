// Copyright © 2022 cuisongliu@qq.com.
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
	"errors"
	"fmt"
	"path"
	"strings"

	"github.com/labring/sealos/pkg/runtime"

	"github.com/spf13/cobra"

	"github.com/labring/sealos/pkg/apply/processor"
	"github.com/labring/sealos/pkg/clusterfile"
	"github.com/labring/sealos/pkg/constants"
	"github.com/labring/sealos/pkg/runtime/factory"
	fileutils "github.com/labring/sealos/pkg/utils/file"
	"github.com/labring/sealos/pkg/utils/logger"
)

func newCertCmd() *cobra.Command {
	var altNames []string
	var renewTargets []string
	var groups []string

	cmd := &cobra.Command{
		Use:   "cert",
		Short: "update Kubernetes API server's cert",
		Long: `Add domain or ip in certs:
    you had better backup old certs first.
	sealos cert --alt-names sealos.io,10.103.97.2,127.0.0.1,localhost
    using "openssl x509 -noout -text -in apiserver.crt" to check the cert
	will update cluster API server cert, you need to restart your API server manually after using sealos cert.

    For example: add an EIP to cert.
    1. sealos cert --alt-names 39.105.169.253
    2. edit .kube/config, set the apiserver address as 39.105.169.253, (don't forget to open the security group port for 6443, if you using public cloud)
    3. kubectl get pod, to check if it works or not
		`,
		RunE: func(cmd *cobra.Command, args []string) error {
			if len(renewTargets) != 0 {
				if len(altNames) != 0 {
					return errors.New("--alt-names and --renew cannot be used together")
				}
			} else if len(altNames) == 0 {
				return errors.New("--alt-names is required unless --renew is set")
			}
			if cmd.Flags().Changed("groups") && len(renewTargets) == 0 {
				return errors.New("--groups requires --renew")
			}

			processor.SyncNewVersionConfig(clusterName)

			clusterPath := constants.Clusterfile(clusterName)
			pathResolver := constants.NewPathResolver(clusterName)

			var runtimeConfigPath string

			for _, f := range []string{
				path.Join(pathResolver.ConfigsPath(), "kubeadm-init.yaml"),
				path.Join(pathResolver.EtcPath(), "kubeadm-init.yaml"),
				path.Join(pathResolver.ConfigsPath(), "k3s-init.yaml"),
			} {
				if fileutils.IsExist(f) {
					runtimeConfigPath = f
					break
				}
			}
			if runtimeConfigPath == "" {
				logger.Warn("cannot locate the default runtime config file")
			}
			var opts []clusterfile.OptionFunc
			if runtimeConfigPath != "" {
				opts = append(opts, clusterfile.WithCustomRuntimeConfigFiles([]string{runtimeConfigPath}))
			}
			cf := clusterfile.NewClusterFile(clusterPath, opts...)
			if err := cf.Process(); err != nil {
				return err
			}

			logger.Info("update certs for cluster %s", cf.GetCluster().GetName())

			rt, err := factory.New(cf.GetCluster(), cf.GetRuntimeConfig())
			if err != nil {
				return fmt.Errorf("create runtime failed: %v", err)
			}
			if cm, ok := rt.(runtime.CertManager); ok {
				if len(renewTargets) != 0 {
					renewOpts := runtime.CertRenewOptions{Targets: renewTargets}
					if cmd.Flags().Changed("groups") {
						renewOpts.Groups = normalizeFlagValues(groups)
					}
					logger.Info("using %s cert renew implement on targets %v", cf.GetCluster().GetDistribution(), renewTargets)
					return cm.Renew(renewOpts)
				}
				logger.Info("using %s cert update implement", cf.GetCluster().GetDistribution())
				return cm.UpdateCertSANs(altNames)
			}
			if len(renewTargets) != 0 {
				return fmt.Errorf("renew targets %v are not supported for distribution %s", renewTargets, cf.GetCluster().GetDistribution())
			}
			return nil
		},
	}
	cmd.Flags().StringVarP(&clusterName, "cluster", "c", "default", "name of cluster to applied exec action")
	cmd.Flags().StringSliceVar(&altNames, "alt-names", []string{}, "add extra Subject Alternative Names for certs, domain or ip, eg. sealos.io or 10.103.97.2")
	cmd.Flags().StringSliceVar(&renewTargets, "renew", nil, "renew local cert targets; local admin.conf is synced to node $HOME/.kube/config, super-admin.conf stays local only")
	cmd.Flags().StringSliceVar(&groups, "groups", nil, "override admin kubeconfig certificate groups when renewing admin.conf or all")

	return cmd
}

func normalizeFlagValues(values []string) []string {
	normalized := make([]string, 0, len(values))
	seen := make(map[string]struct{}, len(values))
	for _, value := range values {
		value = strings.TrimSpace(value)
		if value == "" {
			continue
		}
		if _, ok := seen[value]; ok {
			continue
		}
		seen[value] = struct{}{}
		normalized = append(normalized, value)
	}
	return normalized
}
