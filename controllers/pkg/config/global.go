package config

import (
	"gopkg.in/yaml.v3"
	"io/ioutil"
)

type Config struct {
	Global GlobalConfig `yaml:"global"`
}

type GlobalConfig struct {
	CloudDomain    string   `yaml:"cloudDomain"`
	CloudPort      string   `yaml:"cloudPort"`
	RegionUid      string   `yaml:"regionUid"`
	CertSecretName string   `yaml:"certSecretName"`
	Common         Common   `yaml:"common"`
	Database       Database `yaml:"database"`
}

type Common struct {
	GuildEnabled string `yaml:"guildEnabled"`
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
