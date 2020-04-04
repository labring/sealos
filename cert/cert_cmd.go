package cert

import (
	"fmt"
	"github.com/wonderivan/logger"
	"os"
)

// return sealos cert command
func CertCMD(altNames []string, hostIP, hostName, serviceCIRD string) string {
	cmd := fmt.Sprintf("sealos cert --node-ip %s --node-name %s --service-cird %s", hostIP, hostName, serviceCIRD)
	for _, name := range altNames {
		cmd += fmt.Sprintf(" --alt-names %s", name)
	}

	return cmd
}
func CertGenerator(certPATH, certEtcdPATH string, altNames []string, hostIP, hostName, serviceCIRD string) {
	certConfig, err := NewSealosCertMetaData(certPATH, certEtcdPATH, altNames, serviceCIRD, hostName, hostIP)
	if err != nil {
		logger.Error("generator cert config failed %s", err)
		os.Exit(-1)
	}
	certConfig.GenerateAll()
}
