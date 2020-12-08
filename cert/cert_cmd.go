package cert

import (
	"fmt"
	"os"

	"github.com/wonderivan/logger"
)

// CMD return sealos cert command
func CMD(altNames []string, hostIP, hostName, serviceCIRD, DNSDomain string) string {
	cmd := "sealos cert "
	if hostIP != "" {
		cmd += fmt.Sprintf(" --node-ip %s", hostIP)
	}

	if hostName != "" {
		cmd += fmt.Sprintf(" --node-name %s", hostName)
	}

	if serviceCIRD != "" {
		cmd += fmt.Sprintf(" --service-cidr %s", serviceCIRD)
	}

	if DNSDomain != "" {
		cmd += fmt.Sprintf(" --dns-domain %s", DNSDomain)
	}

	for _, name := range altNames {
		if name != "" {
			cmd += fmt.Sprintf(" --alt-names %s", name)
		}
	}

	return cmd
}

// GenerateCert generate all cert.
func GenerateCert(certPATH, certEtcdPATH string, altNames []string, hostIP, hostName, serviceCIRD, DNSDomain string) {
	certConfig, err := NewSealosCertMetaData(certPATH, certEtcdPATH, altNames, serviceCIRD, hostName, hostIP, DNSDomain)
	if err != nil {
		logger.Error("generator cert config failed %s", err)
		os.Exit(-1)
	}
	certConfig.GenerateAll()
}
