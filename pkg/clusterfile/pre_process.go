package clusterfile

import (
	"bytes"
	"fmt"
	"io"
	"os"

	"github.com/fanux/sealos/pkg/runtime"
	v2 "github.com/fanux/sealos/pkg/types/v1beta1"
	"github.com/fanux/sealos/pkg/utils/contants"
	"github.com/fanux/sealos/pkg/utils/decode"
	fileutil "github.com/fanux/sealos/pkg/utils/file"
	"github.com/fanux/sealos/pkg/utils/logger"

	runtime2 "k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/util/yaml"
)

type PreProcessor interface {
	Process() error
}

func NewPreProcessor(path string) PreProcessor {
	return &ClusterFile{path: path}
}

func (c *ClusterFile) GetPipeLine() ([]func() error, error) {
	var todoList []func() error
	todoList = append(todoList,
		c.PrePareCluster,
		c.PrePareEnv,
		c.PrePareConfigs,
	)
	return todoList, nil
}

func (c *ClusterFile) Process() error {
	pipeLine, err := c.GetPipeLine()
	if err != nil {
		return err
	}
	for _, f := range pipeLine {
		if err := f(); err != nil {
			return err
		}
	}
	return nil
}

func (c *ClusterFile) PrePareEnv() error {
	clusterFileData, err := fileutil.ReadAll(c.path)
	if err != nil {
		return err
	}
	err = c.DecodeConfigs(clusterFileData)
	if err != nil && err != ErrTypeNotFound {
		return err
	}
	err = c.DecodeKubeadmConfig(clusterFileData)
	if err != nil && err != ErrTypeNotFound {
		return err
	}
	return nil
}

func (c *ClusterFile) PrePareConfigs() error {
	var configs []v2.Config
	for _, c := range c.GetConfigs() {
		cfg := c
		configs = append(configs, cfg)
	}
	c.Configs = configs
	return nil
}

func (c *ClusterFile) PrePareCluster() error {
	f, err := os.Open(c.path)
	if err != nil {
		return err
	}
	defer func() {
		if err := f.Close(); err != nil {
			logger.Fatal("failed to close file")
		}
	}()
	d := yaml.NewYAMLOrJSONDecoder(f, 4096)
	for {
		ext := runtime2.RawExtension{}
		if err = d.Decode(&ext); err != nil {
			if err == io.EOF {
				break
			}
			continue
		}
		ext.Raw = bytes.TrimSpace(ext.Raw)
		if len(ext.Raw) == 0 || bytes.Equal(ext.Raw, []byte("null")) {
			continue
		}
		err = c.DecodeCluster(ext.Raw)
		if err == nil {
			return nil
		}
	}
	return fmt.Errorf("failed to decode cluster from %s, %v", c.path, err)
}

func (c *ClusterFile) DecodeCluster(data []byte) error {
	cluster, err := GetClusterFromDataCompatV1(data)
	if err != nil {
		return err
	}
	c.Cluster = *cluster
	return nil
}

func (c *ClusterFile) DecodeConfigs(data []byte) error {
	configs, err := decode.CRDForBytes(data, contants.Config)
	if err != nil {
		return err
	}
	if configs == nil {
		return ErrTypeNotFound
	}
	cfgs := configs.([]v2.Config)
	c.Configs = cfgs
	return nil
}

func (c *ClusterFile) DecodeKubeadmConfig(data []byte) error {
	kubeadmConfig, err := runtime.LoadKubeadmConfigs(string(data), runtime.DecodeCRDFromString)
	if err != nil {
		return err
	}
	if kubeadmConfig == nil {
		return ErrTypeNotFound
	}
	c.KubeConfig = kubeadmConfig
	return nil
}
