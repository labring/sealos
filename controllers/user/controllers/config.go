package controllers

import (
	"github.com/labring/sealos/controllers/pkg/config"
)

type Config struct {
	Global config.Global `yaml:"global"`
	Kube   config.Kube   `yaml:"kube"`
}
