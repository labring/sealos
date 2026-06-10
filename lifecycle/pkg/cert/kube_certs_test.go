// Copyright © 2021 sealos.
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
	"os"
	"path/filepath"
	"testing"

	certutil "k8s.io/client-go/util/cert"
)

func TestGenerateAll(t *testing.T) {
	BasePath := "/tmp/kubernetes/pki"
	EtcdBasePath := "/tmp/kubernetes/pki/etcd"
	tests := []struct {
		name    string
		wantErr bool
	}{
		{
			"generate all certs",
			false,
		},
	}
	certMeta, err := NewSealosCertMetaData(BasePath, EtcdBasePath, []string{"test.com", "192.168.1.2", "kubernetes.default.svc.sealos"}, "10.64.0.0/10", "master1", "172.27.139.11", "cluster.local")
	if err != nil {
		t.Error(err)
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if err := certMeta.GenerateAll(); (err != nil) != tt.wantErr {
				t.Errorf("GenerateAll() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestRenewAllRotatesRootCA(t *testing.T) {
	basePath := t.TempDir()
	certPath := filepath.Join(basePath, "pki")
	etcdPath := filepath.Join(certPath, "etcd")

	meta, err := NewSealosCertMetaData(certPath, etcdPath, []string{"test.com", "192.168.1.2"}, "10.64.0.0/10", "master1", "172.27.139.11", "cluster.local")
	if err != nil {
		t.Fatal(err)
	}
	if err = meta.GenerateAll(); err != nil {
		t.Fatalf("GenerateAll() error = %v", err)
	}

	oldPEM, err := os.ReadFile(filepath.Join(certPath, "ca.crt"))
	if err != nil {
		t.Fatalf("ReadFile(old ca.crt) error = %v", err)
	}
	oldCerts, err := certutil.ParseCertsPEM(oldPEM)
	if err != nil || len(oldCerts) == 0 {
		t.Fatalf("ParseCertsPEM(old ca.crt) error = %v", err)
	}

	if err = meta.RenewAll(); err != nil {
		t.Fatalf("RenewAll() error = %v", err)
	}

	newPEM, err := os.ReadFile(filepath.Join(certPath, "ca.crt"))
	if err != nil {
		t.Fatalf("ReadFile(new ca.crt) error = %v", err)
	}
	newCerts, err := certutil.ParseCertsPEM(newPEM)
	if err != nil || len(newCerts) == 0 {
		t.Fatalf("ParseCertsPEM(new ca.crt) error = %v", err)
	}

	if string(oldPEM) == string(newPEM) {
		t.Fatalf("expected root CA certificate to change after RenewAll()")
	}
}

func TestGenerateAllForV129UsesUpdatedIdentityModel(t *testing.T) {
	basePath := t.TempDir()
	certPath := filepath.Join(basePath, "pki")
	etcdPath := filepath.Join(certPath, "etcd")

	meta, err := NewSealosCertMetaDataForKubeVersion(certPath, etcdPath, []string{"test.com", "192.168.1.2"}, "10.64.0.0/10", "master1", "172.27.139.11", "cluster.local", kubeVersion129)
	if err != nil {
		t.Fatal(err)
	}
	if err = meta.GenerateAll(); err != nil {
		t.Fatalf("GenerateAll() error = %v", err)
	}

	tests := []struct {
		name     string
		path     string
		wantOrgs []string
	}{
		{
			name:     "apiserver-kubelet-client",
			path:     filepath.Join(certPath, "apiserver-kubelet-client.crt"),
			wantOrgs: []string{clusterAdminsGroup},
		},
		{
			name:     "apiserver-etcd-client",
			path:     filepath.Join(certPath, "apiserver-etcd-client.crt"),
			wantOrgs: nil,
		},
		{
			name:     "etcd-healthcheck-client",
			path:     filepath.Join(etcdPath, "healthcheck-client.crt"),
			wantOrgs: nil,
		},
	}

	for _, tt := range tests {
		certs, err := certutil.CertsFromFile(tt.path)
		if err != nil {
			t.Fatalf("CertsFromFile(%s) error = %v", tt.name, err)
		}
		if len(certs) == 0 {
			t.Fatalf("expected certificate for %s", tt.name)
		}
		if got := certs[0].Subject.Organization; len(got) != len(tt.wantOrgs) {
			t.Fatalf("%s organizations = %v, want %v", tt.name, got, tt.wantOrgs)
		} else {
			for i := range got {
				if got[i] != tt.wantOrgs[i] {
					t.Fatalf("%s organizations = %v, want %v", tt.name, got, tt.wantOrgs)
				}
			}
		}
	}
}

func TestRenewLeafCertsForV129KeepsCAAndUsesUpdatedIdentityModel(t *testing.T) {
	basePath := t.TempDir()
	certPath := filepath.Join(basePath, "pki")
	etcdPath := filepath.Join(certPath, "etcd")

	meta, err := NewSealosCertMetaData(certPath, etcdPath, []string{"test.com", "192.168.1.2"}, "10.64.0.0/10", "master1", "172.27.139.11", "cluster.local")
	if err != nil {
		t.Fatal(err)
	}
	if err = meta.GenerateAll(); err != nil {
		t.Fatalf("GenerateAll() error = %v", err)
	}

	oldCA, err := os.ReadFile(filepath.Join(certPath, "ca.crt"))
	if err != nil {
		t.Fatalf("ReadFile(ca.crt) error = %v", err)
	}

	if err = RenewLeafCertsForKubeVersion(certPath, etcdPath, []string{"test.com", "192.168.1.2"}, "172.27.139.11", "master1", "10.64.0.0/10", "cluster.local", kubeVersion129); err != nil {
		t.Fatalf("RenewLeafCertsForKubeVersion() error = %v", err)
	}

	newCA, err := os.ReadFile(filepath.Join(certPath, "ca.crt"))
	if err != nil {
		t.Fatalf("ReadFile(ca.crt) after renew error = %v", err)
	}
	if string(oldCA) != string(newCA) {
		t.Fatal("expected RenewLeafCertsForKubeVersion() to preserve the existing CA")
	}

	tests := []struct {
		name     string
		path     string
		wantOrgs []string
	}{
		{
			name:     "apiserver-kubelet-client",
			path:     filepath.Join(certPath, "apiserver-kubelet-client.crt"),
			wantOrgs: []string{clusterAdminsGroup},
		},
		{
			name:     "apiserver-etcd-client",
			path:     filepath.Join(certPath, "apiserver-etcd-client.crt"),
			wantOrgs: nil,
		},
		{
			name:     "etcd-healthcheck-client",
			path:     filepath.Join(etcdPath, "healthcheck-client.crt"),
			wantOrgs: nil,
		},
	}

	for _, tt := range tests {
		certs, err := certutil.CertsFromFile(tt.path)
		if err != nil {
			t.Fatalf("CertsFromFile(%s) error = %v", tt.name, err)
		}
		if len(certs) == 0 {
			t.Fatalf("expected certificate for %s", tt.name)
		}
		if got := certs[0].Subject.Organization; len(got) != len(tt.wantOrgs) {
			t.Fatalf("%s organizations = %v, want %v", tt.name, got, tt.wantOrgs)
		} else {
			for i := range got {
				if got[i] != tt.wantOrgs[i] {
					t.Fatalf("%s organizations = %v, want %v", tt.name, got, tt.wantOrgs)
				}
			}
		}
	}
}
