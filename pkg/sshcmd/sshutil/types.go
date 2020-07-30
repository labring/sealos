package sshutil

import "time"

type SSH struct {
	User       string
	Password   string
	PkFile     string
	PkPassword string
	Timeout    *time.Duration
}
