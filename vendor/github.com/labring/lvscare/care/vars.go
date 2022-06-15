package care

import "github.com/labring/lvscare/service"

type LvsCare struct {
	HealthPath    string
	HealthSchem   string // http or https
	VirtualServer string
	RealServer    []string
	RunOnce       bool
	Clean         bool
	Interval      int32
	Logger        string
	//
	lvs service.Lvser
}

var LVS LvsCare
