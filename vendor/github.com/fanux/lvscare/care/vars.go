package care

import "github.com/fanux/lvscare/service"

type LvsCare struct {
	HealthPath    string
	HealthSchem   string // http or https
	VirtualServer string
	RealServer    []string
	RunOnce       bool
	Interval      int32
	//
	lvs service.Lvser
}

var LVS LvsCare
