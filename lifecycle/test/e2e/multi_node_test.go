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

package e2e

import (
	"fmt"
	"os"

	"github.com/labring/sealos/test/e2e/testhelper/settings"

	"github.com/labring/sealos/test/e2e/terraform"
	"github.com/labring/sealos/test/e2e/testhelper/utils"

	cmd2 "github.com/labring/sealos/test/e2e/testhelper/cmd"

	"github.com/labring/sealos/pkg/utils/logger"

	. "github.com/onsi/ginkgo/v2"
)

var _ = Describe("E2E_sealos_multi_node_test", func() {
	Context("start apply", func() {

		var tf = &terraform.Terraform{
			AccessKey: os.Getenv("ALIYUN_ACCESS_KEY_ID"),
			SecretKey: os.Getenv("ALIYUN_ACCESS_KEY_SECRET"),
		}
		var (
			applier     *Applier
			infraDetail *terraform.InfraDetail
		)
		BeforeEach(func() {
			err := tf.Apply(settings.GetEnvWithDefault("SEALOS_TEST_ARCH", "amd64"))
			utils.CheckErr(err, "failed to apply terraform")
			infraDetail, err = tf.Detail()
			utils.CheckErr(err, fmt.Sprintf("failed to get infra detail: %v", err))
			applier, err = NewApplier(infraDetail)
			utils.CheckErr(err, fmt.Sprintf("failed to new applier: %v", err))
		})
		AfterEach(func() {
			err := tf.Destroy()
			utils.CheckErr(err, "failed to destroy terraform")
		})

		// all ips: ip1 ip2 ip3 ip4
		It("apply run test", func() {
			runOpts := &cmd2.RunOptions{
				Cluster: applier.ClusterName,
				Images:  []string{applier.ImageName},
				Masters: []string{infraDetail.Nodes[0].PrivateIP},
				Nodes:   []string{infraDetail.Nodes[1].PrivateIP},
				Force:   true,
				SSH:     applier.SSH,
			}

			By("test run ", func() {
				// run master ip1, worker ip2
				logger.Info("runOpts: %#+v", runOpts.Args())
				utils.CheckErr(applier.RemoteSealosCmd.Run(runOpts))
			})

			By("test run app image", func() {
				runAppOpts := &cmd2.RunOptions{
					Images:  applier.RunImages,
					Cluster: applier.ClusterName,
				}
				logger.Info("runAppOpts: %#+v", runAppOpts.Args())
				utils.CheckErr(applier.RemoteSealosCmd.Run(runAppOpts))
			})

			applier.FetchRemoteKubeConfig()
			//check result
			applier.CheckNodeNum(2)
			By("add nodes test", func() {
				// add ip3, ip4
				addOpts := &cmd2.AddOptions{
					Cluster: applier.ClusterName,
					Nodes:   []string{infraDetail.Nodes[2].PrivateIP, infraDetail.Nodes[3].PrivateIP},
				}
				logger.Info("addOpts: %#+v", addOpts)
				utils.CheckErr(applier.RemoteSealosCmd.Add(addOpts))
				//check result
				applier.CheckNodeNum(4)
			})
			By("delete nodes test", func() {
				// delete ip2, ip3
				deleteOpts := &cmd2.DeleteOptions{
					Cluster: applier.ClusterName,
					Nodes:   []string{infraDetail.Nodes[1].PrivateIP, infraDetail.Nodes[2].PrivateIP},
					Force:   true,
				}
				logger.Info("deleteOpts: %#+v", deleteOpts.Args())
				utils.CheckErr(applier.RemoteSealosCmd.Delete(deleteOpts))
				//check result
				applier.CheckNodeNum(2)
			})
			By("add masters test", func() {
				// add ip2, ip3
				addOpts := &cmd2.AddOptions{
					Cluster: applier.ClusterName,
					Masters: []string{infraDetail.Nodes[1].PrivateIP, infraDetail.Nodes[2].PrivateIP},
				}
				logger.Info("addOpts: %#+v", addOpts.Args())
				utils.CheckErr(applier.RemoteSealosCmd.Add(addOpts))
				//check result
				applier.CheckNodeNum(4)
			})
			By("delete masters test", func() {
				// delete ip2, ip3
				deleteOpts := &cmd2.DeleteOptions{
					Cluster: applier.ClusterName,
					Masters: []string{infraDetail.Nodes[1].PrivateIP, infraDetail.Nodes[2].PrivateIP},
					Force:   true,
				}
				logger.Info("deleteOpts: %#+v", deleteOpts.Args())
				utils.CheckErr(applier.RemoteSealosCmd.Delete(deleteOpts))
				//check result 1master will cause etcd down, skip check
				//testApplier.CheckNodeNum(2)
			})
			By("reset test", func() {
				resetOpts := &cmd2.ResetOptions{
					Cluster: applier.ClusterName,
					Force:   true,
				}
				logger.Info("resetOpts: %#+v", resetOpts.Args())
				utils.CheckErr(applier.RemoteSealosCmd.Reset(resetOpts))
			})
		})
	})
})
