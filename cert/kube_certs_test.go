package cert

import (
	"testing"
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
	certMeta, err := NewSealosCertMetaData(BasePath, EtcdBasePath, []string{"test.com", "192.168.1.2", "kubernetes.default.svc.sealyun"}, "10.64.0.0/10", "master1", "172.27.139.11", "cluster.local")
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
