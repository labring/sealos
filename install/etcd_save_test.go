package install

import (
	"encoding/json"
	"github.com/wonderivan/logger"

	"testing"
)

func Test_reFormatHostToIp(t *testing.T) {
	type args struct {
		host string
	}
	tests := []struct {
		name string
		args args
		want string
	}{
		{"test",args{"192.168.0.22:22"},"192.168.0.22"},
		{"test02",args{"192.168.0.22"},"192.168.0.22"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := reFormatHostToIp(tt.args.host); got != tt.want {
				t.Errorf("reFormatHostToIp() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestHealthCheck(t *testing.T) {
	a:= `[{"endpoint":"192.168.160.243:2379","health":true,"took":"8.281132ms"}]`
	var b []respone
	err := json.Unmarshal([]byte(a), &b)
	if err != nil {
		logger.Error(err)
	}
	logger.Info(b)
}