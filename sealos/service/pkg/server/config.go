package server

import (
	"fmt"
	"os"

	"gopkg.in/yaml.v2"
)

type Config struct {
	Server ServeConfig `yaml:"server"`
}

type ServeConfig struct {
	ListenAddress string `yaml:"addr"`
}

func InitConfig(configPath string) (*Config, error) {
	configData, err := os.ReadFile(configPath)
	if err != nil {
		return nil, fmt.Errorf("could not read %s: %s", configPath, err)
	}
	c := &Config{}
	if err := yaml.Unmarshal(configData, c); err != nil {
		return nil, fmt.Errorf("could not parse config: %s", err)
	}

	return c, nil
}
