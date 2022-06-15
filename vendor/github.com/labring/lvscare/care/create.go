package care

import (
	"github.com/labring/lvscare/internal/glog"
	"github.com/labring/lvscare/service"
)

//createVsAndRs is
func (care *LvsCare) createVsAndRs() {
	//ip, _ := utils.SplitServer(vs)
	if care.lvs == nil {
		care.lvs = service.BuildLvscare()
	}
	var errs []string
	isAvailable := care.lvs.IsVirtualServerAvailable(care.VirtualServer)
	if !isAvailable {
		err := care.lvs.CreateVirtualServer(care.VirtualServer, true)
		//virtual server is exists
		if err != nil {
			//can't return
			errs = append(errs, err.Error())
		}
	}
	for _, r := range care.RealServer {
		err := care.lvs.CreateRealServer(r, true)
		if err != nil {
			errs = append(errs, err.Error())
		}
	}
	if len(errs) != 0 {
		glog.Errorf("createVsAndRs error: %v", errs)
	}
}
