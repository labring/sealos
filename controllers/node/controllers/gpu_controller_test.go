package controllers

import (
	"testing"
)

func TestParseHamiNvidiaRegister(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		wantProd string
		wantMem  string
	}{
		{
			name:     "JSON format single healthy device",
			input:    `[{"type":"NVIDIA-GeForce-RTX-3090","devmem":25363,"count":1,"health":true}]`,
			wantProd: "NVIDIA-GeForce-RTX-3090",
			wantMem:  "25363",
		},
		{
			name:     "JSON format multiple devices, first healthy",
			input:    `[{"type":"Broken-GPU","devmem":1000,"count":1,"health":false}, {"type":"NVIDIA-Tesla-T4","devmem":15360,"count":1,"health":true}]`,
			wantProd: "NVIDIA-Tesla-T4",
			wantMem:  "15360",
		},
		{
			name:     "CSV format",
			input:    `GPU-uuid,pci,15360,NVIDIA,Tesla T4,1,true`,
			wantProd: "Tesla T4",
			wantMem:  "15360",
		},
		{
			name:     "CSV format multiple",
			input:    `GPU-1,pci,1000,NVIDIA,Bad,1,false:GPU-2,pci,15360,NVIDIA,Tesla T4,1,true`,
			wantProd: "Tesla T4",
			wantMem:  "15360",
		},
		{
			name:     "Empty input",
			input:    ``,
			wantProd: "",
			wantMem:  "",
		},
		{
			name:     "Invalid JSON",
			input:    `{not-an-array}`,
			wantProd: "",
			wantMem:  "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			gotProd, gotMem := parseHamiNvidiaRegister(tt.input)
			if gotProd != tt.wantProd {
				t.Errorf("parseHamiNvidiaRegister() gotProd = %v, want %v", gotProd, tt.wantProd)
			}
			if gotMem != tt.wantMem {
				t.Errorf("parseHamiNvidiaRegister() gotMem = %v, want %v", gotMem, tt.wantMem)
			}
		})
	}
}

func TestParseHamiNvidiaRegisterVirtualCount(t *testing.T) {
	tests := []struct {
		name  string
		input string
		want  int64
	}{
		{
			name:  "JSON format single device",
			input: `[{"type":"NVIDIA-GeForce-RTX-3090","devmem":25363,"count":5,"health":true}]`,
			want:  5,
		},
		{
			name:  "JSON format multiple devices",
			input: `[{"type":"NVIDIA-GeForce-RTX-3090","devmem":25363,"count":5,"health":true}, {"type":"NVIDIA-GeForce-RTX-3090","devmem":25363,"count":3,"health":true}]`,
			want:  8,
		},
		{
			name:  "JSON format with unhealthy device",
			input: `[{"type":"NVIDIA-GeForce-RTX-3090","devmem":25363,"count":5,"health":true}, {"type":"NVIDIA-GeForce-RTX-3090","devmem":25363,"count":3,"health":false}]`,
			want:  5,
		},
		{
			name:  "Not JSON (CSV)",
			input: `GPU-uuid,pci,15360,NVIDIA,Tesla T4,1,true`,
			want:  0,
		},
		{
			name:  "Empty input",
			input: ``,
			want:  0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := parseHamiNvidiaRegisterVirtualCount(tt.input); got != tt.want {
				t.Errorf("parseHamiNvidiaRegisterVirtualCount() = %v, want %v", got, tt.want)
			}
		})
	}
}
