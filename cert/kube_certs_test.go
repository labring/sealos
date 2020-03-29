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
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if err := GenerateAll(); (err != nil) != tt.wantErr {
				t.Errorf("GenerateAll() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}