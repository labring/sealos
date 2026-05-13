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
	return GenerateCertForKubeVersion(certPATH, certEtcdPATH, altNames, hostIP, hostName, serviceCIRD, DNSDomain, "")
}

func GenerateCertForKubeVersion(certPATH, certEtcdPATH string, altNames []string, hostIP, hostName, serviceCIRD, DNSDomain, kubeVersion string) error {
	certConfig, err := NewSealosCertMetaDataForKubeVersion(certPATH, certEtcdPATH, altNames, serviceCIRD, hostName, hostIP, DNSDomain, kubeVersion)
	if err != nil {
		return fmt.Errorf("generator cert config failed %v", err)
	}
	return certConfig.GenerateAll()
}

// RenewCert regenerates all local PKI files, including root CAs and leaf certificates.
func RenewCert(certPATH, certEtcdPATH string, altNames []string, hostIP, hostName, serviceCIRD, DNSDomain string) error {
	return RenewCertForKubeVersion(certPATH, certEtcdPATH, altNames, hostIP, hostName, serviceCIRD, DNSDomain, "")
}

func RenewCertForKubeVersion(certPATH, certEtcdPATH string, altNames []string, hostIP, hostName, serviceCIRD, DNSDomain, kubeVersion string) error {
	certConfig, err := NewSealosCertMetaDataForKubeVersion(certPATH, certEtcdPATH, altNames, serviceCIRD, hostName, hostIP, DNSDomain, kubeVersion)
	if err != nil {
		return fmt.Errorf("generator cert config failed %v", err)
	}
	return certConfig.RenewAll()
}

// RenewLeafCerts regenerates local leaf certificates while preserving the existing CAs.
func RenewLeafCerts(certPATH, certEtcdPATH string, altNames []string, hostIP, hostName, serviceCIRD, DNSDomain string) error {
	return RenewLeafCertsForKubeVersion(certPATH, certEtcdPATH, altNames, hostIP, hostName, serviceCIRD, DNSDomain, "")
}

func RenewLeafCertsForKubeVersion(certPATH, certEtcdPATH string, altNames []string, hostIP, hostName, serviceCIRD, DNSDomain, kubeVersion string) error {
	certConfig, err := NewSealosCertMetaDataForKubeVersion(certPATH, certEtcdPATH, altNames, serviceCIRD, hostName, hostIP, DNSDomain, kubeVersion)
	if err != nil {
		return fmt.Errorf("generator cert config failed %v", err)
	}
	return certConfig.RenewLeafCerts()
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
