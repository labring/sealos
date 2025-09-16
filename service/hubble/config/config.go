package config

import (
	"errors"
	"fmt"
	"os"

	"github.com/labring/sealos/service/hubble/pkg/config"
	"gopkg.in/yaml.v3"
)

func LoadConfig(configPath string) (*config.Config, error) {
	cfg := &config.Config{
		Auth: config.AuthConfig{
			WhiteList: "",
		},
		HTTP: config.HTTPConfig{
			Port: ":8080",
		},
		Hubble: config.HubbleConfig{
			Addr: "localhost:4245",
		},
		Redis: config.RedisConfig{
			Addr:     "localhost:6379",
			Username: "default",
			Password: "",
			DB:       0,
		},
	}
	if configPath == "" {
		return nil, errors.New("config path is required")
	}
	data, err := os.ReadFile(configPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read config file: %w", err)
	}
	if err := yaml.Unmarshal(data, cfg); err != nil {
		return nil, fmt.Errorf("failed to parse config file: %w", err)
	}
	return cfg, nil
}
