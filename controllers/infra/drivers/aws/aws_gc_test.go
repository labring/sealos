package aws

import "testing"

func TestKeyPairGC(t *testing.T) {
	tests := []struct {
		name    string
		wantErr bool
	}{
		{
			"test key pair gc",
			false,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cli, _ := NewGarbageCollector()
			if err := cli.KeyPairGC(); (err != nil) != tt.wantErr {
				t.Errorf("KeyPairGC() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestInstanceGC(t *testing.T) {
	tests := []struct {
		name    string
		wantErr bool
	}{
		{
			"test instance gc",
			false,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cli, _ := NewGarbageCollector()
			if err := cli.InstanceGC(); (err != nil) != tt.wantErr {
				t.Errorf("InstanceGC() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}
