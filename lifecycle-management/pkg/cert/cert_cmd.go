/*
Copyright 2022 cuisongliu@qq.com.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

package cert

import "fmt"

// GenerateCert generate all cert.
func GenerateCert(certPATH, certEtcdPATH string, altNames []string, hostIP, hostName, serviceCIRD, DNSDomain string) error {
	certConfig, err := NewSealosCertMetaData(certPATH, certEtcdPATH, altNames, serviceCIRD, hostName, hostIP, DNSDomain)
	if err != nil {
		return fmt.Errorf("generator cert config failed %v", err)
	}
	return certConfig.GenerateAll()
}

func GenerateRegistryCert(registryCertPath string, BaseName string) error {
	regCertConfig := Config{
		Path:         registryCertPath,
		BaseName:     BaseName,
		CommonName:   BaseName,
		Organization: []string{"labring"},
		Year:         100,
	}
	cert, key, err := NewCaCertAndKey(regCertConfig)
	if err != nil {
		return err
	}
	return WriteCertAndKey(regCertConfig.Path, regCertConfig.BaseName, cert, key)
}
