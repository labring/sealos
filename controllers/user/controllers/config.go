package controllers

import (
	"github.com/labring/sealos/controllers/pkg/config"
)

type Config struct {
	config.Global `yaml:",inline"`
	config.Kube   `yaml:"kube"`
}
