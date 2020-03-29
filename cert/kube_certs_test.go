package cert

import "testing"

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
	certMeta, _ := NewSealosCertMetaData([]string{"test.com", "127.0.0.2", "kubernetes.default.svc.sealyun"}, "10.64.0.0/10")

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if err := GenerateAll(certMeta); (err != nil) != tt.wantErr {
				t.Errorf("GenerateAll() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}