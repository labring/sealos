package e2e

import (
	"fmt"
	"path/filepath"
	"time"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	"github.com/labring/sealos/pkg/utils/logger"

	. "github.com/onsi/ginkgo/v2"

	v1 "github.com/labring/sealos/controllers/infra/api/v1"
	"github.com/labring/sealos/controllers/infra/drivers"
	"github.com/labring/sealos/pkg/ssh"
	"github.com/labring/sealos/pkg/types/v1beta1"
	"github.com/labring/sealos/test/e2e/suites/apply"
	"github.com/labring/sealos/test/e2e/suites/cmd"
	infra2 "github.com/labring/sealos/test/e2e/suites/infra"
	"github.com/labring/sealos/test/e2e/testhelper"
	"github.com/labring/sealos/test/e2e/testhelper/settings"
)

var _ = Describe("apply test", func() {
	Context("start apply", func() {

		var (
			infra       *v1.Infra
			host        *v1.Hosts
			eip         []string
			privateIps  []string
			infraDriver drivers.Driver
			testApplier *apply.Applier
			err         error
		)
		host = &v1.Hosts{
			Roles:     []string{"master"},
			Count:     4,
			Resources: nil,
			//need set with env
			Flavor: "ecs.c7.large",
			Arch:   "",
			//Image:  "centos_7_9_x64_20G_alibase_20230109.vhd",
			Image: "ubuntu_22_04_x64_20G_alibase_20230208.vhd",
			Disks: []v1.Disk{
				{
					Capacity:   40,
					Type:       "root",
					VolumeType: "cloud_essd",
				}, /*
					{
						Capacity:   20,
						Type:       "data",
						VolumeType: "cloud_essd",
					},*/
			},
			Metadata: nil,
		}
		infra = &v1.Infra{
			TypeMeta: metav1.TypeMeta{},
			ObjectMeta: metav1.ObjectMeta{
				Name:      "sealos-e2e-infra",
				Namespace: "sealos-e2e-ns",
				UID:       "60a6f958-e9af-4bb5-a401-1553fc05d78b",
			},
			Spec: v1.InfraSpec{
				SSH: v1beta1.SSH{
					PkName: "e2e-infra-test",
				},
			},
		}
		logger.Info("init apply test")
		BeforeEach(func() {
			/*
			   aliyun need set ALIYUN_REGION_ID, ALIYUN_ACCESS_KEY_ID, ALIYUN_ACCESS_KEY_SECRET ALIYUN_REGION_ID environment
			*/

			apply.PreCheckEnv()
			infraDriver, err = drivers.NewDriver(settings.E2EConfig.InfraDriver)
			testhelper.CheckErr(err, fmt.Sprintf("failed to get %s driver: %v", settings.E2EConfig.InfraDriver, err))
			//testhelper.CheckErr(yaml.Unmarshal([]byte(infra2.InfraTmpl), infra))
			//testhelper.CheckErr(yaml.Unmarshal([]byte(infra2.InfraTmpl), host))
			err = infraDriver.CreateKeyPair(infra)
			testhelper.CheckErr(err, fmt.Sprintf("failed to create keypair: %v", err))
			err = infraDriver.CreateInstances(host, infra)
			testhelper.CheckErr(err, fmt.Sprintf("failed to create instances: %v", err))
			hosts, err := infraDriver.GetInstances(infra, "running")
			testhelper.CheckErr(err, fmt.Sprintf("failed to get instances: %v", err))
			infra.Spec.Hosts = hosts
			testhelper.CheckErr(testhelper.MarshalYamlToFile(filepath.Join(settings.E2EConfig.TestDir, "infra.yaml"+time.Now().Format("20060102150405")), infra))
			if len(infra2.GetPublicIP(infra.Spec.Hosts)) == 0 {
				testhelper.CheckErr(fmt.Errorf("no public ip found"))
			}
			eip = infra2.GetPublicIP(infra.Spec.Hosts)
			privateIps = infra2.GetPrivateIP(infra.Spec.Hosts)
			testhelper.CheckErr(func() error {
				if len(privateIps) <= 3 {
					return fmt.Errorf("need gt 4 private ips, but got %d", len(privateIps))
				}
				return nil
			}())
			infra.Spec.SSH.User = settings.RootUser
			infra.Spec.SSH.Port = settings.DefaultSSHPort
			// init Remote SSH
			settings.E2EConfig.SSH = &v1beta1.SSH{
				User:   settings.RootUser,
				PkData: infra.Spec.SSH.PkData,
				Pk:     filepath.Join(settings.E2EConfig.TestDir, "apply_id_rsa"),
				PkName: infra.Spec.SSH.PkName,
				Port:   settings.DefaultSSHPort,
			}

			testApplier = &apply.Applier{EIp: eip, InfraDriver: infraDriver,
				RemoteCmd: cmd.Interface(&cmd.RemoteCmd{Host: eip[0],
					Interface: ssh.NewSSHClient(settings.E2EConfig.SSH, true)}),
				LocalCmd: &cmd.LocalCmd{}}
			testApplier.Init()
		})
		AfterEach(func() {
			err = infraDriver.DeleteInfra(infra)
			testhelper.CheckErr(err, "failed to delete infra")
			//delete keypair
			err = infraDriver.DeleteKeyPair(infra)
			testhelper.CheckErr(err, "failed to delete keypair")
		})

		// all ips: ip1 ip2 ip3 ip4
		// run master ip1, worker ip2
		It("run test", func() {
			runOpts := &cmd.RunOptions{
				Cluster: settings.E2EConfig.ClusterName,
				Images:  []string{settings.E2EConfig.ImageName},
				Masters: privateIps[:1],
				Nodes:   privateIps[1:2],
				Force:   true,
				SSH: &v1beta1.SSH{
					User: settings.E2EConfig.SSH.User,
					Port: settings.E2EConfig.SSH.Port,
					Pk:   settings.E2EConfig.SSH.Pk,
				},
			}
			By("test run ", func() {
				logger.Info("runOpts: %#+v", runOpts.Args())
				testhelper.CheckErr(testApplier.RemoteSealosCmd.Run(runOpts))
			})

			By("test run app image", func() {
				logger.Info("runOpts: %#+v", runOpts.Args())
				testhelper.CheckErr(testApplier.RemoteSealosCmd.Run(&cmd.RunOptions{
					Images:  []string{settings.HelmImageName, settings.CalicoImageName},
					Cluster: settings.E2EConfig.ClusterName,
				}))
			})

			testApplier.FetchRemoteKubeConfig()
			//check result
			testApplier.CheckNodeNum(2)
			By("add nodes test", func() {
				// add ip3, ip4
				addOpts := &cmd.AddOptions{
					Cluster: settings.E2EConfig.ClusterName,
					Nodes:   privateIps[2:4],
				}
				logger.Info("addOpts: %#+v", addOpts)
				testhelper.CheckErr(testApplier.RemoteSealosCmd.Add(addOpts))
				//check result
				testApplier.CheckNodeNum(4)
			})
			By("delete nodes test", func() {
				// delete ip2, ip3
				deleteOpts := &cmd.DeleteOptions{
					Cluster: settings.E2EConfig.ClusterName,
					Nodes:   privateIps[1:3],
					Force:   true,
				}
				logger.Info("deleteOpts: %#+v", deleteOpts.Args())
				testhelper.CheckErr(testApplier.RemoteSealosCmd.Delete(deleteOpts))
				//check result
				testApplier.CheckNodeNum(2)
			})
			By("add masters test", func() {
				// add ip2, ip3
				addOpts := &cmd.AddOptions{
					Cluster: settings.E2EConfig.ClusterName,
					Masters: privateIps[1:3],
				}
				logger.Info("addOpts: %#+v", addOpts.Args())
				testhelper.CheckErr(testApplier.RemoteSealosCmd.Add(addOpts))
				//check result
				testApplier.CheckNodeNum(4)
			})
			By("delete masters test", func() {
				// delete ip2, ip3
				deleteOpts := &cmd.DeleteOptions{
					Cluster: settings.E2EConfig.ClusterName,
					Masters: privateIps[1:3],
					Force:   true,
				}
				logger.Info("deleteOpts: %#+v", deleteOpts.Args())
				testhelper.CheckErr(testApplier.RemoteSealosCmd.Delete(deleteOpts))
				//check result 1master will cause etcd down, skip check
				//testApplier.CheckNodeNum(2)
			})
			By("reset test", func() {
				resetOpts := &cmd.ResetOptions{
					Cluster: settings.E2EConfig.ClusterName,
					Force:   true,
					SSH: &v1beta1.SSH{
						User: settings.E2EConfig.SSH.User,
						Port: settings.E2EConfig.SSH.Port,
						Pk:   settings.E2EConfig.SSH.Pk,
					},
				}
				logger.Info("resetOpts: %#+v", resetOpts.Args())
				testhelper.CheckErr(testApplier.RemoteSealosCmd.Reset(resetOpts))
			})
		})

	})
})
