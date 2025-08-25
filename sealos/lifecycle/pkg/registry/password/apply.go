/*
Copyright 2023 cuisongliu@qq.com.

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

package password

import (
	"errors"
	"fmt"
	"path"
	"strings"

	"github.com/modood/table"
	"github.com/spf13/pflag"

	"github.com/labring/sealos/pkg/clusterfile"
	"github.com/labring/sealos/pkg/constants"
	"github.com/labring/sealos/pkg/exec"
	"github.com/labring/sealos/pkg/registry/helpers"
	"github.com/labring/sealos/pkg/ssh"
	"github.com/labring/sealos/pkg/types/v1beta1"
	"github.com/labring/sealos/pkg/utils/confirm"
	fileutil "github.com/labring/sealos/pkg/utils/file"
	"github.com/labring/sealos/pkg/utils/logger"
)

type RegistryPasswdResults struct {
	ClusterName          string
	HtpasswdPath         string
	ImageCRIShimFilePath string
	RegistryType         string
	RegistryUsername     string
	RegistryPasswd       string
	execer               exec.Interface
	upgrade              Upgrade
}

func (r *RegistryPasswdResults) RegisterFlags(fs *pflag.FlagSet) {
	fs.SetInterspersed(false)
	fs.StringVarP(&r.ClusterName, "cluster-name", "c", "default", "cluster name")
	fs.StringVarP(&r.HtpasswdPath, "htpasswd-path", "p", "/etc/registry/registry_htpasswd", "registry passwd file path")
	fs.StringVarP(&r.ImageCRIShimFilePath, "cri-shim-file-path", "f", "/etc/image-cri-shim.yaml", "image cri shim file path,if empty will not update image cri shim file")
}

type confirmPrint struct {
	Name     string
	Value    string
	Describe string
}

func (r *RegistryPasswdResults) Validate() (*v1beta1.Cluster, error) {
	if r.ClusterName == "" {
		return nil, errors.New("cluster name is empty")
	}
	if r.HtpasswdPath == "" {
		return nil, errors.New("htpasswd path is empty")
	}
	clusterPath := constants.Clusterfile(r.ClusterName)
	if !fileutil.IsExist(clusterPath) {
		logger.Warn("cluster %s not exist", r.ClusterName)
		return nil, nil
	}
	clusterFile := clusterfile.NewClusterFile(clusterPath)
	err := clusterFile.Process()
	if err != nil {
		return nil, fmt.Errorf("cluster %s process error: %+v", r.ClusterName, err)
	}
	cluster := clusterFile.GetCluster()
	r.RegistryType = confirm.SelectInput("Please select registry type", []string{string(RegistryTypeRegistry), string(RegistryTypeContainerd), string(RegistryTypeDocker)})
	if r.RegistryType == "" {
		return nil, errors.New("invalid registry type")
	}
	r.RegistryUsername = confirm.Input("Please input registry username", "admin", func(input string) error {
		if len(input) < 3 {
			return errors.New("username must have more than 3 characters")
		}
		return nil
	})
	r.RegistryPasswd = confirm.PasswordInput("Please input registry password")
	if r.RegistryUsername == "" || r.RegistryPasswd == "" {
		return nil, errors.New("must provide registry username and password")
	}
	prints := []confirmPrint{
		{
			Name:     "ClusterName",
			Value:    r.ClusterName,
			Describe: "cluster name",
		},
		{
			Name:     "HtpasswdPath",
			Value:    r.HtpasswdPath,
			Describe: "registry passwd file path",
		},
		{
			Name:     "ImageCRIShimFilePath",
			Value:    r.ImageCRIShimFilePath,
			Describe: "image cri shim file path",
		},
		{
			Name:     "RegistryType",
			Value:    r.RegistryType,
			Describe: "registry type",
		},
		{
			Name:     "RegistryUsername",
			Value:    r.RegistryUsername,
			Describe: "registry username",
		},
		{
			Name:     "RegistryPasswd",
			Value:    "******",
			Describe: "registry password",
		},
	}
	table.OutputA(prints)
	if yes, _ := confirm.Confirm("Are you sure to run this command?", "you have canceled to update registry passwd !"); !yes {
		return nil, nil
	}
	return cluster, nil
}

func (r *RegistryPasswdResults) Apply(cluster *v1beta1.Cluster) error {
	if r.execer == nil {
		sshClient := ssh.NewCacheClientFromCluster(cluster, true)
		execer, err := exec.New(sshClient)
		if err != nil {
			return err
		}
		r.execer = execer
	}
	if r.upgrade == nil {
		r.upgrade = NewUpgrade(cluster.Name, r.execer)
	}
	root := constants.NewPathResolver(cluster.Name).RootFSPath()
	registry := helpers.GetRegistryInfo(r.execer, root, cluster.GetRegistryIPAndPort())
	shim := helpers.GetImageCRIShimInfo(r.execer, r.ImageCRIShimFilePath, cluster.GetMaster0IPAndPort())
	if registry == nil || shim == nil {
		return errors.New("get registry or shim info error")
	}
	registry.Username = r.RegistryUsername
	registry.Password = r.RegistryPasswd
	shim.Auth = fmt.Sprintf("%s:%s", r.RegistryUsername, r.RegistryPasswd)
	passwordErrorIP := make([]string, 0)
	for _, v := range cluster.GetRegistryIPAndPortList() {
		if err := r.upgrade.UpdateRegistryPasswd(registry, r.HtpasswdPath, v, RegistryType(r.RegistryType)); err != nil {
			logger.Debug("update registry passwd error: %s", err.Error())
			passwordErrorIP = append(passwordErrorIP, v)
		}
	}
	logger.Info("update registry passwd success")
	configErrorIP := make([]string, 0)
	shimConfigErrorIP := make([]string, 0)
	etcPath := path.Join(root, constants.EtcDirName, helpers.RegistryCustomConfig)
	for _, v := range cluster.GetAllIPS() {
		if err := r.upgrade.UpdateRegistryConfig(registry, etcPath, v); err != nil {
			logger.Debug("update registry config error: %s", err.Error())
			configErrorIP = append(configErrorIP, v)
		}
		if r.ImageCRIShimFilePath == "" {
			continue
		}
		if err := r.upgrade.UpdateImageShimConfig(shim, r.ImageCRIShimFilePath, v); err != nil {
			logger.Debug("update image cri shim config error: %s", err.Error())
			shimConfigErrorIP = append(shimConfigErrorIP, v)
		}
	}
	if len(passwordErrorIP) > 0 || len(configErrorIP) > 0 || len(shimConfigErrorIP) > 0 {
		logger.Error("update registry passwd or config error,please check")
		prints := []confirmPrint{
			{
				Name:     "RegistryPasswdIP",
				Value:    strings.Join(passwordErrorIP, ","),
				Describe: "registry password error ip",
			},
			{
				Name:     "ConfigIP",
				Value:    strings.Join(configErrorIP, ","),
				Describe: "config error ip",
			},
			{
				Name:     "ShimConfigIP",
				Value:    strings.Join(shimConfigErrorIP, ","),
				Describe: "image cri shim config error ip",
			},
		}
		table.OutputA(prints)
		return nil
	}
	logger.Info("update cri shim config and registry config success")
	return nil
}
