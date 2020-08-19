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
	
	# snapshot save the etcd
	sealos etcd --snap-save --name snapshot --path  /opt/sealos/ectd-backup

	# snapshot restore the etcd
	sealos etcd --restore --name snapshot --path  /opt/sealos/ectd-backup
`

// etcdCmd represents the etcd command
var etcdCmd = &cobra.Command{
	Use:   "etcd",
	Short: "Simplest way to snapshot/restore your kubernets etcd",
	Long: `etcd --snap-save --name snapshot`,
	Example: exampleCmd,
	Run: func(cmd *cobra.Command, args []string) {
		if install.EtcdSnapshotSave {
			e := install.GetEtcdBackFlags()
			install.Save(e)
			logger.Info("Finished saving/uploading snapshot [%s] on all etcd hosts", e.Name)
			e.HealthCheck()
		}
		if install.EtcdHealthCheck {
			e := install.GetEtcdBackFlags()
			e.HealthCheck()
		}

	},
}

func init() {
	rootCmd.AddCommand(etcdCmd)

	etcdCmd.Flags().BoolVar(&install.EtcdSnapshotSave, "snap-save", false, "snapshot your kubernets etcd ")
	etcdCmd.Flags().BoolVar(&install.EtcdRestore, "restore", false, "restore your kubernets etcd")
	etcdCmd.Flags().BoolVar(&install.EtcdHealthCheck, "health", false, "check your kubernets etcd")
	etcdCmd.Flags().StringVar(&install.SnapshotName,"name",install.ETCDSNAPSHOTDEFAULTNAME,"Specify snapshot name")
	etcdCmd.Flags().StringVar(&install.EtcdBackDir,"path",install.ETCDDEFAULTBACKUPDIR,"Specify snapshot backup dir")

	// Here you will define your flags and configuration settings.

	// Cobra supports Persistent Flags which will work for this command
	// and all subcommands, e.g.:
	// etcdCmd.PersistentFlags().String("foo", "", "A help for foo")

	// Cobra supports local flags which will only run when this command
	// is called directly, e.g.:
	// etcdCmd.Flags().BoolP("toggle", "t", false, "Help message for toggle")
}
