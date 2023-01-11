package aws

import "testing"

func TestListAndDeleteKeyPair(t *testing.T) {
	tests := []struct {
		name    string
		wantErr bool
	}{
		{
			"test delete all key pair",
			false,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if err := ListAndDeleteKeyPair(); (err != nil) != tt.wantErr {
				t.Errorf("ListAndDeleteKeyPair() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}
