package cert

import "fmt"

// return sealos cert command
func CertCMD(altNames []string, hostIP, hostName, serviceCIRD string) string{
	cmd := fmt.Sprintf("sealos cert --node-ip %s --node-name %s --service-cird",hostIP,hostName)
	for _,name := range altNames{
		cmd += fmt.Sprintf(" --alt-names %s",name)
	}

	return cmd
}
