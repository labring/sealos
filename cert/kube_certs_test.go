package cert

import (
	"testing"
)

func TestGenerateAll(t *testing.T) {
	tests := []struct {
		name    string
		wantErr bool
	}{
		{
			"generate all certs",
			false,
		},
	}
	certMeta, err := NewSealosCertMetaData([]string{"test.com", "192.168.1.2", "kubernetes.default.svc.sealyun"}, "10.64.0.0/10")
	if err != nil {
		t.Error(err)
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if err := GenerateAll(certMeta); (err != nil) != tt.wantErr {
				t.Errorf("GenerateAll() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}