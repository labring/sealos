package controllers

import (
	"github.com/labring/sealos/controllers/pkg/config"
)

type Config struct {
	config.Global `yaml:"global"`
	config.Kube   `yaml:"kube"`
}
