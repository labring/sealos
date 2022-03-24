package clusterfile

import (
	"errors"

	"github.com/fanux/sealos/pkg/runtime"
	v2 "github.com/fanux/sealos/pkg/types/v1beta1"
)

var ErrTypeNotFound = errors.New("no corresponding type structure was found")

type ClusterFile struct {
	path       string
	Cluster    v2.Cluster
	Configs    []v2.Config
	KubeConfig *runtime.KubeadmConfig
	//Plugins    []v1.Plugin
}

type Interface interface {
	PreProcessor
	GetCluster() v2.Cluster
	GetConfigs() []v2.Config
	//GetPlugins() []v1.Plugin
	GetKubeadmConfig() *runtime.KubeadmConfig
}

func (c *ClusterFile) GetCluster() v2.Cluster {
	return c.Cluster
}

func (c *ClusterFile) GetConfigs() []v2.Config {
	return c.Configs
}

//func (c *ClusterFile) GetPlugins() []v1.Plugin {
//	return c.Plugins
//}

func (c *ClusterFile) GetKubeadmConfig() *runtime.KubeadmConfig {
	return c.KubeConfig
}

func NewClusterFile(path string) Interface {
	return &ClusterFile{path: path}
}
