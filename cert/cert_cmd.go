package cert

import (
	"fmt"
	"github.com/wonderivan/logger"
	"os"
)

// return sealos cert command
func CertCMD(altNames []string, hostIP, hostName, serviceCIRD , DNSDomain string) string {
	cmd := fmt.Sprintf("sealos cert --node-ip %s --node-name %s --service-cird %s --dns-domain %s", hostIP, hostName, serviceCIRD, DNSDomain)
	for _, name := range altNames {
		cmd += fmt.Sprintf(" --alt-names %s", name)
	}

	return cmd
}
func GenerateCert(certPATH, certEtcdPATH string, altNames []string, hostIP, hostName, serviceCIRD, DNSDomian string) {
	certConfig, err := NewSealosCertMetaData(certPATH, certEtcdPATH, altNames, serviceCIRD, hostName, hostIP, DNSDomian)
	if err != nil {
		logger.Error("generator cert config failed %s", err)
		os.Exit(-1)
	}
	certConfig.GenerateAll()
}
