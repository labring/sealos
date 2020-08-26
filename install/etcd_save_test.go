package install

import (
	"fmt"
	"testing"
	"time"
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


	u := fmt.Sprintf("%v", time.Now().Unix())
	fmt.Println(u)
}