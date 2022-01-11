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
	"fmt"
	"os"
	"time"

	"github.com/spf13/cobra"

	"github.com/fanux/sealos/install"
	"github.com/fanux/sealos/pkg/logger"
)

var exampleCmd = `
 	# snapshot save the etcd, the backupPath is on etcd nodes. not on the sealos init machine.
	sealos etcd save --name snapshot --backupPath  /opt/sealos/etcd-backup
	
	# save the snapshot to aliyun oss bucket. this recommend to use in cronjob 
	sealos etcd save --aliId youraliyunkeyid --aliKey youraliyunkeysecrets --ep oss-cn-hangzhou.aliyuncs.com  \
	--bucket etcdbackup  --objectPath /sealos/ --docker

	# snapshot restore the etcd
	sealos etcd restore --name snapshot --backupPath  /opt/sealos/etcd-backup

	# etcd health check
	sealos etcd health
`

var force bool

func init() {
	rootCmd.AddCommand(NewEtcdCommand())
	// Here you will define your flags and configuration settings.

	// Cobra supports Persistent Flags which will work for this command
	// and all subcommands, e.g.:
	// etcdCmd.PersistentFlags().String("foo", "", "A help for foo")

	// Cobra supports local flags which will only run when this command
	// is called directly, e.g.:
	// etcdCmd.Flags().BoolP("toggle", "t", false, "Help message for toggle")
}

func NewEtcdCommand() *cobra.Command {
	cmd := &cobra.Command{
		Use:     "etcd <subcommand>",
		Short:   "Simplest way to snapshot/restore your kubernets etcd",
		Long:    `sealos etcd save --name snapshot`,
		Example: exampleCmd,
	}
	cmd.AddCommand(NewEtcdSaveCommand())
	cmd.AddCommand(NewEtcdRestoreCommand())
	cmd.AddCommand(NewEtcdHealthCommand())
	//cmd.Flags().BoolVar(&install.EtcdSnapshotSave, "snap-save", false, "snapshot your kubernets etcd ")
	//cmd.Flags().BoolVar(&install.EtcdRestore, "snap-restore", false, "restore your kubernets etcd")
	//cmd.Flags().BoolVar(&install.EtcdHealthCheck, "health", false, "check your kubernets etcd")
	// can not inherit to subCommand
	//cmd.Flags().StringVar(&install.SnapshotName,"name",install.ETCDSNAPSHOTDEFAULTNAME,"Specify snapshot name")
	//cmd.Flags().StringVar(&install.EtcdBackDir,"backupPath",install.ETCDDEFAULTBACKUPDIR,"Specify snapshot backup dir")
	//cmd.Flags().StringVar(&install.RestorePath,"restorePath",install.ETCDDEFAULTRESTOREDIR,"Specify snapshot restore dir")

	return cmd
}
func NewEtcdSaveCommand() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "save",
		Short: "Stores an etcd node backend snapshot to a given file",
		Run:   EtcdSaveCmdFunc,
	}
	cmd.Flags().BoolVar(&install.InDocker, "docker", false, "snapshot your kubernets etcd in container, will add unix timestamp to snapshot name")
	cmd.Flags().StringVar(&install.SnapshotName, "name", install.ETCDSNAPSHOTDEFAULTNAME, "Specify snapshot name")
	cmd.Flags().StringVar(&install.EtcdBackDir, "backupPath", install.ETCDDEFAULTBACKUPDIR, "Specify snapshot backup dir")
	cmd.Flags().StringVar(&install.BucketName, "bucket", "", "oss bucketName to save snapshot")
	cmd.Flags().StringVar(&install.AccessKeyID, "aliId", "", "aliyun accessKeyId to save snapshot")
	cmd.Flags().StringVar(&install.AccessKeySecrets, "aliKey", "", "aliyun accessKeySecrets to save snapshot")
	cmd.Flags().StringVar(&install.OssEndpoint, "ep", "", "aliyun endpoints to save snapshot")
	cmd.Flags().StringVar(&install.ObjectPath, "objectPath", "", "aliyun oss objectPath to save snapshot, like: /sealos/snapshots/")

	return cmd
}

func NewEtcdRestoreCommand() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "restore",
		Short: "Restores an etcd member snapshot to an etcd directory",
		Run:   EtcdRestoreCmdFunc,
	}
	cmd.Flags().StringVar(&install.SnapshotName, "name", install.ETCDSNAPSHOTDEFAULTNAME, "Specify snapshot name")
	cmd.Flags().StringVar(&install.EtcdBackDir, "backupPath", install.ETCDDEFAULTBACKUPDIR, "Specify snapshot backup dir")
	cmd.Flags().StringVar(&install.RestorePath, "restorePath", install.ETCDDEFAULTRESTOREDIR, "Specify snapshot restore dir")
	cmd.Flags().BoolVarP(&force, "force", "f", false, "restore need interactive to confirm")
	return cmd
}

func NewEtcdHealthCommand() *cobra.Command {
	return &cobra.Command{
		Use:   "health",
		Short: "test your etcd status",
		Run:   EtcdHealthCmdFunc,
	}
}

func EtcdSaveCmdFunc(cmd *cobra.Command, args []string) {
	e := install.GetEtcdBackFlags(cfgFile)
	err := e.Save(install.InDocker)
	if err == nil && e.AccessKeyID != "" {
		e.Dump(cfgFile)
	}
	logger.Info("Finished saving/uploading snapshot [%s]", e.Name)
	e.HealthCheck()
}

func EtcdRestoreCmdFunc(cmd *cobra.Command, args []string) {
	e := install.GetRestoreFlags(cfgFile)
	// restore need interactive to confirm
	if !force {
		prompt := fmt.Sprintf("restore cmd will stop your kubernetes cluster immediately and restore etcd from your backup %s file  (y/n)?", e.Name)
		result := install.Confirm(prompt)
		if !result {
			logger.Info("restore %s file is skip, Exit", e.Name)
			os.Exit(-1)
		}
	}
	e.RestoreAll()
	//logger.Info("Restore Success! Check Your Restore Dir: %s", e.RestoreDir)
	time.Sleep(time.Second * 10)
	// stop etcd kube-apiserver
	tmpdir, _ := e.StopPod()
	time.Sleep(time.Second * 10)
	logger.Info("send restore file to etcd master node and start etcd")
	// send restore file to etcd master node to  start etcd
	if err := e.AfterRestore(); err != nil {
		logger.Error(err)
		logger.Info("Start RecoveryKuBeCluster")
		e.RecoveryKuBeCluster(tmpdir)
		os.Exit(1)
	}
	logger.Info("Start kube-apiserver kube-controller-manager kube-scheduler")
	// start kube-apiserver
	e.StartPod(tmpdir)
	logger.Info("Wait 60s to health check for etcd")
	time.Sleep(time.Second * 60)
	e.HealthCheck()
	logger.Info("restore kubernetes yourself glad~")
}

func EtcdHealthCmdFunc(cmd *cobra.Command, args []string) {
	e := install.GetHealthFlag(cfgFile)
	e.HealthCheck()
}
