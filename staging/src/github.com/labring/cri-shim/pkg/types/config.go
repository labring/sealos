package types

import (
	"os"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/util/yaml"
)

const (
	// SealosCriShimSock is the CRI socket the shim listens on.
	SealosCriShimSock         = "/var/run/sealos/cri-shim.sock"
	DefaultImageCRIShimConfig = "/etc/sealos/cri-shim.yaml"
)

type Config struct {
	CRIShimSocket string          `json:"shimSocket"`
	RuntimeSocket string          `json:"criSocket"`
	Timeout       metav1.Duration `json:"timeout"`
}

func Unmarshal(path string) (*Config, error) {
	metadata, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	cfg := &Config{}
	if err = yaml.Unmarshal(metadata, cfg); err != nil {
		return nil, err
	}
	return cfg, err
}
