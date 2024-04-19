package controllers

import (
	"github.com/labring/sealos/controllers/pkg/config"
)

type Config struct {
	Global         config.GlobalConfig `yaml:"global"`
	TerminalConfig TerminalConfig      `yaml:"terminalController"`
}

type TerminalConfig struct {
	IngressTlsSecretName string `yaml:"ingressTlsSecretName"`
}
