package install

import "github.com/wonderivan/logger"

//Print is
func (s *SealosInstaller) Print() {
	logger.Info("	sealos config is: ", *s)
}
