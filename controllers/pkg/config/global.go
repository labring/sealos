package config

import (
	"gopkg.in/yaml.v3"
	"os"
)

type Global struct {
	CloudDomain    string `yaml:"cloudDomain"`
	CloudPort      string `yaml:"cloudPort"`
	RegionUID      string `yaml:"regionUID"`
	CertSecretName string `yaml:"certSecretName"`
}

type Kube struct {
	Version       string `yaml:"version"`
	APIServerHost string `yaml:"apiServerHost"`
	APIServerPort string `yaml:"apiServerPort"`
}

type Common struct {
	GuideEnabled string `yaml:"guideEnabled"`
	APIEnabled   string `yaml:"apiEnabled"`
}

type Database struct {
	MongodbURI             string `yaml:"mongodbURI"`
	GlobalCockroachdbURI   string `yaml:"globalCockroachdbURI"`
	RegionalCockroachdbURI string `yaml:"regionalCockroachdbURI"`
}

func LoadConfig(path string, target interface{}) error {
	configData, err := os.ReadFile(path)
	if err != nil {
		return err
	}
	err = yaml.Unmarshal(configData, target)
	if err != nil {
		return err
	}
	return nil
}
