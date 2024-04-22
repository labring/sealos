package config

import (
	"io/ioutil"

	"gopkg.in/yaml.v3"
)

type Global struct {
	CloudDomain    string `yaml:"cloudDomain"`
	CloudPort      string `yaml:"cloudPort"`
	RegionUid      string `yaml:"regionUid"`
	CertSecretName string `yaml:"certSecretName"`
}

type Kube struct {
	Version       string `yaml:"version"`
	ApiServerHost string `yaml:"apiServerHost"`
	ApiServerPort string `yaml:"apiServerPort"`
}

type Common struct {
	GuideEnabled string `yaml:"guideEnabled"`
	ApiEnabled   string `yaml:"apiEnabled"`
}

type Database struct {
	MongodbUri             string `yaml:"mongodbUri"`
	GlobalCockroachdbUri   string `yaml:"globalCockroachdbUri"`
	RegionalCockroachdbUri string `yaml:"regionalCockroachdbUri"`
}

func LoadConfig(path string, target interface{}) error {
	configData, err := ioutil.ReadFile(path)
	if err != nil {
		return err
	}
	err = yaml.Unmarshal(configData, target)
	if err != nil {
		return err
	}
	return nil
}
