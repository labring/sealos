package e2e

import (
	"fmt"
	"path/filepath"
	"time"

	"github.com/labring/sealos/test/e2e/testhelper/utils"

	cmd2 "github.com/labring/sealos/test/e2e/testhelper/cmd"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	"github.com/labring/sealos/pkg/utils/logger"

	. "github.com/onsi/ginkgo/v2"

	v1 "github.com/labring/sealos/controllers/infra/api/v1"
	"github.com/labring/sealos/controllers/infra/drivers"
	"github.com/labring/sealos/pkg/ssh"
	"github.com/labring/sealos/pkg/types/v1beta1"
	"github.com/labring/sealos/test/e2e/suites/apply"
	infra2 "github.com/labring/sealos/test/e2e/suites/infra"
	"github.com/labring/sealos/test/e2e/testhelper/settings"
)

var _ = Describe("E2E_sealos_apply_infra_test", func() {
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
		infraCheck := infra2.NewFakeInfra()
		sshInterface := new(v1beta1.SSH)
		BeforeEach(func() {
			/*
			   aliyun need set ALIYUN_REGION_ID, ALIYUN_ACCESS_KEY_ID, ALIYUN_ACCESS_KEY_SECRET ALIYUN_REGION_ID environment
			*/
			infraCheck.PreSetEnv()
			infraCheck.PreCheckEnv()
			apply.PreSetInfraConfig(infra, host)
			infraDriver, err = drivers.NewDriver(infraCheck.InfraDriver)
			utils.CheckErr(err, fmt.Sprintf("failed to get %s driver: %v", infraCheck.InfraDriver, err))
			//testhelper.CheckErr(yaml.Unmarshal([]byte(infra2.InfraTmpl), infra))
			//testhelper.CheckErr(yaml.Unmarshal([]byte(infra2.InfraTmpl), host))
			err = infraDriver.CreateKeyPair(infra)
			utils.CheckErr(err, fmt.Sprintf("failed to create keypair: %v", err))
			err = infraDriver.CreateInstances(host, infra)
			utils.CheckErr(err, fmt.Sprintf("failed to create instances: %v", err))
			hosts, err := infraDriver.GetInstances(infra, "running")
			utils.CheckErr(err, fmt.Sprintf("failed to get instances: %v", err))
			infra.Spec.Hosts = hosts
			utils.CheckErr(utils.MarshalYamlToFile(filepath.Join(infraCheck.TestDir, "infra.yaml"+time.Now().Format("20060102150405")), infra))
			if len(infra2.GetPublicIP(infra.Spec.Hosts)) == 0 {
				utils.CheckErr(fmt.Errorf("no public ip found"))
			}
			eip = infra2.GetPublicIP(infra.Spec.Hosts)
			privateIps = infra2.GetPrivateIP(infra.Spec.Hosts)
			utils.CheckErr(func() error {
				if len(privateIps) <= 3 {
					return fmt.Errorf("need gt 4 private ips, but got %d", len(privateIps))
				}
				return nil
			}())
			infra.Spec.SSH.User = settings.RootUser
			infra.Spec.SSH.Port = settings.DefaultSSHPort
			// init Remote SSH
			sshInterface = &v1beta1.SSH{
				User:   settings.RootUser,
				PkData: infra.Spec.SSH.PkData,
				Pk:     filepath.Join(infraCheck.TestDir, "apply_id_rsa"),
				PkName: infra.Spec.SSH.PkName,
				Port:   settings.DefaultSSHPort,
			}

			testApplier = &apply.Applier{EIp: eip, InfraDriver: infraDriver,
				RemoteCmd: cmd2.Interface(&cmd2.RemoteCmd{Host: eip[0],
					Interface: ssh.NewSSHClient(sshInterface, true)}),
				LocalCmd: &cmd2.LocalCmd{}, Infra: infraCheck, SSH: sshInterface}
			testApplier.Init()
		})
		AfterEach(func() {
			err = infraDriver.DeleteInfra(infra)
			utils.CheckErr(err, "failed to delete infra")
			//delete keypair
			err = infraDriver.DeleteKeyPair(infra)
			utils.CheckErr(err, "failed to delete keypair")
		})

		// all ips: ip1 ip2 ip3 ip4
		// run master ip1, worker ip2
		It("apply run test", func() {
			runOpts := &cmd2.RunOptions{
				Cluster: infraCheck.ClusterName,
				Images:  []string{infraCheck.ImageName},
				Masters: privateIps[:1],
				Nodes:   privateIps[1:2],
				Force:   true,
				SSH: &v1beta1.SSH{
					User: sshInterface.User,
					Port: sshInterface.Port,
					Pk:   sshInterface.Pk,
				},
			}
			By("test run ", func() {
				logger.Info("runOpts: %#+v", runOpts.Args())
				utils.CheckErr(testApplier.RemoteSealosCmd.Run(runOpts))
			})

			By("test run app image", func() {
				logger.Info("runOpts: %#+v", runOpts.Args())
				utils.CheckErr(testApplier.RemoteSealosCmd.Run(&cmd2.RunOptions{
					Images:  []string{settings.HelmImageName, settings.CalicoImageName},
					Cluster: infraCheck.ClusterName,
				}))
			})

			testApplier.FetchRemoteKubeConfig()
			//check result
			testApplier.CheckNodeNum(2)
			By("add nodes test", func() {
				// add ip3, ip4
				addOpts := &cmd2.AddOptions{
					Cluster: infraCheck.ClusterName,
					Nodes:   privateIps[2:4],
				}
				logger.Info("addOpts: %#+v", addOpts)
				utils.CheckErr(testApplier.RemoteSealosCmd.Add(addOpts))
				//check result
				testApplier.CheckNodeNum(4)
			})
			By("delete nodes test", func() {
				// delete ip2, ip3
				deleteOpts := &cmd2.DeleteOptions{
					Cluster: infraCheck.ClusterName,
					Nodes:   privateIps[1:3],
					Force:   true,
				}
				logger.Info("deleteOpts: %#+v", deleteOpts.Args())
				utils.CheckErr(testApplier.RemoteSealosCmd.Delete(deleteOpts))
				//check result
				testApplier.CheckNodeNum(2)
			})
			By("add masters test", func() {
				// add ip2, ip3
				addOpts := &cmd2.AddOptions{
					Cluster: infraCheck.ClusterName,
					Masters: privateIps[1:3],
				}
				logger.Info("addOpts: %#+v", addOpts.Args())
				utils.CheckErr(testApplier.RemoteSealosCmd.Add(addOpts))
				//check result
				testApplier.CheckNodeNum(4)
			})
			By("delete masters test", func() {
				// delete ip2, ip3
				deleteOpts := &cmd2.DeleteOptions{
					Cluster: infraCheck.ClusterName,
					Masters: privateIps[1:3],
					Force:   true,
				}
				logger.Info("deleteOpts: %#+v", deleteOpts.Args())
				utils.CheckErr(testApplier.RemoteSealosCmd.Delete(deleteOpts))
				//check result 1master will cause etcd down, skip check
				//testApplier.CheckNodeNum(2)
			})
			By("reset test", func() {
				resetOpts := &cmd2.ResetOptions{
					Cluster: infraCheck.ClusterName,
					Force:   true,
					SSH: &v1beta1.SSH{
						User: sshInterface.User,
						Port: sshInterface.Port,
						Pk:   sshInterface.Pk,
					},
				}
				logger.Info("resetOpts: %#+v", resetOpts.Args())
				utils.CheckErr(testApplier.RemoteSealosCmd.Reset(resetOpts))
			})
		})

	})
})
