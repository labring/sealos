package install

import (
	"encoding/json"
	"strings"

	"github.com/wonderivan/logger"
)

//Print is
func (s *SealosInstaller) Print(process ...string) {
	if len(process) == 0 {
		configJson, _ := json.Marshal(s)
		logger.Info("\n[globals]sealos config is: ", string(configJson))
	} else {
		var sb strings.Builder
		for _, v := range process {
			sb.Write([]byte("==>"))
			sb.Write([]byte(v))
		}
		logger.Debug(sb.String())
	}

}
func (s *SealosInstaller) PrintFinish() {
	logger.Info("sealos install success.")
}
