package care

import (
	"github.com/wonderivan/logger"
	"time"

	"github.com/fanux/lvscare/service"
)

//VsAndRsCare is
func (care *LvsCare) VsAndRsCare() {
	lvs := service.BuildLvscare()
	//set inner lvs
	care.lvs = lvs
	logger.Debug("VsAndRsCare DeleteVirtualServer")
	err := lvs.DeleteVirtualServer(care.VirtualServer, false)
	logger.Warn("VsAndRsCare DeleteVirtualServer:", err)
	if care.RunOnce {
		care.createVsAndRs()
		return
	}
	t := time.NewTicker(time.Duration(care.Interval) * time.Second)
	for {
		select {
		case <-t.C:
			care.createVsAndRs()
			//check real server
			lvs.CheckRealServers(care.HealthPath, care.HealthSchem)
		}
	}
}
