package install

import (
	"encoding/json"
	"github.com/wonderivan/logger"
	"strings"
)

//Print is
func (s *SealosInstaller) Print(process ...string) {
	if len(process) == 0 {
		configJson, _ := json.Marshal(s)
		logger.Info("\nsealos config is: ", string(configJson))
	} else {
		var sb strings.Builder
		for _, v := range process {
			sb.Write([]byte("==>"))
			sb.Write([]byte(v))
		}
		logger.Warn(sb.String())
	}

}
