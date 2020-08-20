/*
Copyright © 2020 NAME HERE <EMAIL ADDRESS>

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

import (
	"github.com/fanux/sealos/install"
	"github.com/spf13/cobra"
	"github.com/wonderivan/logger"
)

var exampleCmd = `
	
	# snapshot save the etcd, the backupPath is on etcd nodes. not on the sealos init machine.
	sealos etcd --snap-save --name snapshot --backupPath  /opt/sealos/ectd-backup

	# snapshot restore the etcd
	sealos etcd --snap-restore --name snapshot --backupPath  /opt/sealos/ectd-backup  
`

// etcdCmd represents the etcd command
var etcdCmd = &cobra.Command{
	Use:   "etcd",
	Short: "Simplest way to snapshot/restore your kubernets etcd",
	Long: `etcd --snap-save --name snapshot`,
	Example: exampleCmd,
	Run: func(cmd *cobra.Command, args []string) {
		if install.EtcdRestore {
			r := install.GetRestoreFlags()
			install.RestoreFromLocal(r)
			logger.Info("Finished restore snapshot [%s] on all etcd hosts", r.SnapshotName)
		}
		if install.EtcdSnapshotSave {
			e := install.GetEtcdBackFlags()
			install.SnapshotEtcd(e)
			logger.Info("Finished saving/uploading snapshot [%s] on all etcd hosts", e.Name)
		}
	},
}

func init() {
	rootCmd.AddCommand(etcdCmd)

	etcdCmd.Flags().BoolVar(&install.EtcdSnapshotSave, "snap-save", false, "snapshot your kubernets etcd ")
	etcdCmd.Flags().BoolVar(&install.EtcdRestore, "snap-restore", false, "restore your kubernets etcd")
	etcdCmd.Flags().StringVar(&install.SnapshotName,"name",install.ETCDSNAPSHOTDEFAULTNAME,"Specify snapshot name")
	etcdCmd.Flags().StringVar(&install.EtcdBackDir,"backupPath",install.ETCDDEFAULTBACKUPDIR,"Specify snapshot backup dir")
	etcdCmd.Flags().StringVar(&install.RestorePath,"restorePath",install.ECTDRESTOREPATH,"Specify snapshot restore dir")

	// Here you will define your flags and configuration settings.

	// Cobra supports Persistent Flags which will work for this command
	// and all subcommands, e.g.:
	// etcdCmd.PersistentFlags().String("foo", "", "A help for foo")

	// Cobra supports local flags which will only run when this command
	// is called directly, e.g.:
	// etcdCmd.Flags().BoolP("toggle", "t", false, "Help message for toggle")
}
