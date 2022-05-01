// Copyright 2016 The Kubernetes Authors.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package cert

import (
	"bytes"
	"crypto"
	"crypto/x509"
	"fmt"
	"os"
	"path/filepath"

	"github.com/labring/sealos/pkg/utils/logger"

	"github.com/pkg/errors"
	"k8s.io/client-go/tools/clientcmd"
	clientcmdapi "k8s.io/client-go/tools/clientcmd/api"
	"k8s.io/client-go/util/keyutil"
)

// clientCertAuth struct holds info required to build a client certificate to provide authentication info in a kubeconfig object
type clientCertAuth struct {
	CAKey         crypto.Signer
	Organizations []string
}

// tokenAuth struct holds info required to use a token to provide authentication info in a kubeconfig object
type tokenAuth struct {
	Token string
}

// kubeConfigSpec struct holds info required to build a KubeConfig object
type kubeConfigSpec struct {
	CACert         *x509.Certificate
	APIServer      string
	ClientName     string
	TokenAuth      *tokenAuth
	ClientCertAuth *clientCertAuth
}

// CreateJoinControlPlaneKubeConfigFiles will create and write to disk the kubeconfig files required by kubeadm
// join --control-plane workflow, plus the admin kubeconfig file used by the administrator and kubeadm itself; the
// kubelet.conf file must not be created because it will be created and signed by the kubelet TLS bootstrap process.
// If any kubeconfig files already exists, it used only if evaluated equal; otherwise an error is returned.
func CreateJoinControlPlaneKubeConfigFiles(outDir string, cfg Config, nodeName, controlPlaneEndpoint, clusterName string) error {
	return createKubeConfigFiles(
		outDir,
		cfg,
		nodeName,
		controlPlaneEndpoint,
		clusterName,
		"admin.conf",
		"controller-manager.conf",
		"scheduler.conf",
		"kubelet.conf", //master1上的kubeconfig跟随三个组件一起生成
	)
}

// 方法没有被 ↑ 的方法调用，而是在cmd/kubeadm/app/cmd/phases/init/kubeconfig.go里调用
// cmd/kubeadm/app/phases/kubeconfig/kubeconfig.go
func CreateKubeConfigFile(kubeConfigFileName string, outDir string, cfg Config, nodeName, controlPlaneEndpoint, clusterName string) error {
	logger.Info("creating kubeconfig file for %s", kubeConfigFileName)
	return createKubeConfigFiles(outDir, cfg, kubeConfigFileName, nodeName, controlPlaneEndpoint, clusterName)
}

// createKubeConfigFiles creates all the requested kubeconfig files.
// If kubeconfig files already exists, they are used only if evaluated equal; otherwise an error is returned.
func createKubeConfigFiles(outDir string, cfg Config, nodeName, controlPlaneEndpoint, clusterName string, kubeConfigFileNames ...string) error { // gets the KubeConfigSpecs, actualized for the current InitConfiguration
	specs, err := getKubeConfigSpecs(cfg, nodeName, controlPlaneEndpoint)
	if err != nil {
		return err
	}

	for _, kubeConfigFileName := range kubeConfigFileNames {
		// retrieves the KubeConfigSpec for given kubeConfigFileName
		spec, exists := specs[kubeConfigFileName]
		if !exists {
			return errors.Errorf("couldn't retrieve KubeConfigSpec for %s", kubeConfigFileName)
		}

		// builds the KubeConfig object
		config, err := buildKubeConfigFromSpec(spec, clusterName)
		if err != nil {
			return err
		}

		// writes the kubeconfig to disk if it not exists
		if err = createKubeConfigFileIfNotExists(outDir, kubeConfigFileName, config); err != nil {
			return err
		}
	}

	return nil
}

// getKubeConfigSpecs returns all KubeConfigSpecs actualized to the context of the current InitConfiguration
// NB. this methods holds the information about how kubeadm creates kubeconfig files.
func getKubeConfigSpecs(cfg Config, nodeName, controlPlaneEndpoint string) (map[string]*kubeConfigSpec, error) {
	caCert, caKey, err := LoadCaCertAndKeyFromDisk(cfg)
	if err != nil {
		return nil, errors.Wrap(err, "couldn't create a kubeconfig; the CA files couldn't be loaded")
	}

	if len(nodeName) == 0 {
		return nil, errors.New("nodeName can not be empty")
	}

	if len(controlPlaneEndpoint) == 0 {
		return nil, errors.New("controlPlaneEndpoint  can not be empty")
	}

	var kubeConfigSpec = map[string]*kubeConfigSpec{
		"admin.conf": {
			CACert:     caCert,
			APIServer:  controlPlaneEndpoint,
			ClientName: "kubernetes-admin",
			ClientCertAuth: &clientCertAuth{
				CAKey:         caKey,
				Organizations: []string{"system:masters"},
			},
		},
		"kubelet.conf": {
			CACert:     caCert,
			APIServer:  controlPlaneEndpoint,
			ClientName: fmt.Sprintf("%s%s", "system:node:", nodeName),
			ClientCertAuth: &clientCertAuth{
				CAKey:         caKey,
				Organizations: []string{"system:nodes"},
			},
		},
		"controller-manager.conf": {
			CACert:     caCert,
			APIServer:  controlPlaneEndpoint,
			ClientName: "system:kube-controller-manager",
			ClientCertAuth: &clientCertAuth{
				CAKey: caKey,
			},
		},
		"scheduler.conf": {
			CACert:     caCert,
			APIServer:  controlPlaneEndpoint,
			ClientName: "system:kube-scheduler",
			ClientCertAuth: &clientCertAuth{
				CAKey: caKey,
			},
		},
	}

	return kubeConfigSpec, nil
}

// buildKubeConfigFromSpec creates a kubeconfig object for the given kubeConfigSpec
func buildKubeConfigFromSpec(spec *kubeConfigSpec, clustername string) (*clientcmdapi.Config, error) {
	// If this kubeconfig should use token
	if spec.TokenAuth != nil {
		// create a kubeconfig with a token
		return CreateWithToken(
			spec.APIServer,
			clustername,
			spec.ClientName,
			EncodeCertPEM(spec.CACert),
			spec.TokenAuth.Token,
		), nil
	}

	// otherwise, create a client certs
	clientCertConfig := Config{
		CommonName:   spec.ClientName,
		Organization: spec.ClientCertAuth.Organizations,
		Usages:       []x509.ExtKeyUsage{x509.ExtKeyUsageClientAuth},
		Year:         100,
	}

	clientCert, clientKey, err := NewCaCertAndKeyFromRoot(clientCertConfig, spec.CACert, spec.ClientCertAuth.CAKey)
	if err != nil {
		return nil, errors.Wrapf(err, "failure while creating %s client certificate", spec.ClientName)
	}

	encodedClientKey, err := keyutil.MarshalPrivateKeyToPEM(clientKey)
	if err != nil {
		return nil, errors.Wrapf(err, "failed to marshal private key to PEM")
	}
	// create a kubeconfig with the client certs
	return CreateWithCerts(
		spec.APIServer,
		clustername,
		spec.ClientName,
		EncodeCertPEM(spec.CACert),
		encodedClientKey,
		EncodeCertPEM(clientCert),
	), nil
}

// validateKubeConfig check if the kubeconfig file exist and has the expected CA and server URL
func validateKubeConfig(outDir, filename string, config *clientcmdapi.Config) error {
	kubeConfigFilePath := filepath.Join(outDir, filename)

	if _, err := os.Stat(kubeConfigFilePath); err != nil {
		return err
	}

	// The kubeconfig already exists, let's check if it has got the same CA and server URL
	currentConfig, err := clientcmd.LoadFromFile(kubeConfigFilePath)
	if err != nil {
		return errors.Wrapf(err, "failed to load kubeconfig file %s that already exists on disk", kubeConfigFilePath)
	}

	expectedCtx, exists := config.Contexts[config.CurrentContext]
	if !exists {
		return errors.Errorf("failed to find expected context %s", config.CurrentContext)
	}
	expectedCluster := expectedCtx.Cluster
	currentCtx, exists := currentConfig.Contexts[currentConfig.CurrentContext]
	if !exists {
		return errors.Errorf("failed to find CurrentContext in Contexts of the kubeconfig file %s", kubeConfigFilePath)
	}
	currentCluster := currentCtx.Cluster
	if currentConfig.Clusters[currentCluster] == nil {
		return errors.Errorf("failed to find the given CurrentContext Infra in Clusters of the kubeconfig file %s", kubeConfigFilePath)
	}

	// Make sure the compared CAs are whitespace-trimmed. The function clientcmd.LoadFromFile() just decodes
	// the base64 CA and places it raw in the v1.Config object. In case the user has extra whitespace
	// in the CA they used to create a kubeconfig this comparison to a generated v1.Config will otherwise fail.
	caCurrent := bytes.TrimSpace(currentConfig.Clusters[currentCluster].CertificateAuthorityData)
	caExpected := bytes.TrimSpace(config.Clusters[expectedCluster].CertificateAuthorityData)

	// If the current CA cert on disk doesn't match the expected CA cert, error out because we have a file, but it's stale
	if !bytes.Equal(caCurrent, caExpected) {
		return errors.Errorf("a kubeconfig file %q exists already but has got the wrong CA cert", kubeConfigFilePath)
	}
	// If the current API Server location on disk doesn't match the expected API server, error out because we have a file, but it's stale
	if currentConfig.Clusters[currentCluster].Server != config.Clusters[expectedCluster].Server {
		return errors.Errorf("a kubeconfig file %q exists already but has got the wrong API Server URL", kubeConfigFilePath)
	}

	return nil
}

// createKubeConfigFileIfNotExists saves the KubeConfig object into a file if there isn't any file at the given path.
// If there already is a kubeconfig file at the given path; kubeadm tries to load it and check if the values in the
// existing and the expected config equals. If they do; kubeadm will just skip writing the file as it's up-to-date,
// but if a file exists but has old content or isn't a kubeconfig file, this function returns an error.
func createKubeConfigFileIfNotExists(outDir, filename string, config *clientcmdapi.Config) error {
	kubeConfigFilePath := filepath.Join(outDir, filename)

	err := validateKubeConfig(outDir, filename, config)
	if err != nil {
		// Check if the file exist, and if it doesn't, just write it to disk
		if !os.IsNotExist(err) {
			return err
		}
		logger.Debug("[kubeconfig] Writing %q kubeconfig file\n", filename)
		err = WriteToDisk(kubeConfigFilePath, config)
		if err != nil {
			return errors.Wrapf(err, "failed to save kubeconfig file %q on disk", kubeConfigFilePath)
		}
		return nil
	}
	// kubeadm doesn't validate the existing kubeconfig file more than this (kubeadm trusts the client certs to be valid)
	// Basically, if we find a kubeconfig file with the same path; the same CA cert and the same server URL;
	// kubeadm thinks those files are equal and doesn't bother writing a new file
	logger.Debug("[kubeconfig] Using existing kubeconfig file: %q\n", kubeConfigFilePath)

	return nil
}

// cmd/kubeadm/app/util/kubeconfig/kubeconfig.go
// CreateBasic creates a basic, general KubeConfig object that then can be extended
func CreateBasic(serverURL, clusterName, userName string, caCert []byte) *clientcmdapi.Config {
	// Use the cluster and the username as the context name
	contextName := fmt.Sprintf("%s@%s", userName, clusterName)

	return &clientcmdapi.Config{
		Clusters: map[string]*clientcmdapi.Cluster{
			clusterName: {
				Server:                   serverURL,
				CertificateAuthorityData: caCert,
			},
		},
		Contexts: map[string]*clientcmdapi.Context{
			contextName: {
				Cluster:  clusterName,
				AuthInfo: userName,
			},
		},
		AuthInfos:      map[string]*clientcmdapi.AuthInfo{},
		CurrentContext: contextName,
	}
}

// cmd/kubeadm/app/util/kubeconfig/kubeconfig.go
// CreateWithToken creates a KubeConfig object with access to the API server with a token
func CreateWithToken(serverURL, clusterName, userName string, caCert []byte, token string) *clientcmdapi.Config {
	config := CreateBasic(serverURL, clusterName, userName, caCert)
	config.AuthInfos[userName] = &clientcmdapi.AuthInfo{
		Token: token,
	}
	return config
}

// cmd/kubeadm/app/util/kubeconfig/kubeconfig.go
// CreateWithCerts creates a KubeConfig object with access to the API server with client certificates
func CreateWithCerts(serverURL, clusterName, userName string, caCert []byte, clientKey []byte, clientCert []byte) *clientcmdapi.Config {
	config := CreateBasic(serverURL, clusterName, userName, caCert)
	config.AuthInfos[userName] = &clientcmdapi.AuthInfo{
		ClientKeyData:         clientKey,
		ClientCertificateData: clientCert,
	}
	return config
}

// WriteToDisk writes a KubeConfig object down to disk with mode 0600
func WriteToDisk(filename string, kubeconfig *clientcmdapi.Config) error {
	err := clientcmd.WriteToFile(*kubeconfig, filename)
	if err != nil {
		return err
	}

	return nil
}
