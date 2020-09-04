package k8s

import (
	"reflect"
	"testing"
)

func TestIsIpv4(t *testing.T) {
	type args struct {
		ip string
	}
	tests := []struct {
		name string
		args args
		want bool
	}{
		{"test01", args{
			"192.168.0.1",
		}, true},
		{"test02", args{
			"192.168.00.1",
		}, false},
		{"test03", args{
			"dev-master",
		}, false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := IsIpv4(tt.args.ip); got != tt.want {
				t.Errorf("IsIp() = %v, want %v", got, tt.want)
			}
		})
	}
}

func Test_remove(t *testing.T) {
	type args struct {
		a []string
		b string
	}
	tests := []struct {
		name string
		args args
		want []string
	}{
		{"test01", args{
			a: []string{"123", "245", "345"},
			b: "123",
		}, []string{"245", "345"}},
		{"test02", args{
			a: []string{"123", "245", "345", "123", "245", "345", "123", "245", "345"},
			b: "123",
		}, []string{"245", "345", "245", "345", "245", "345"}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := remove(tt.args.a, tt.args.b); !reflect.DeepEqual(got, tt.want) {
				t.Errorf("remove() = %v, want %v", got, tt.want)
			}
		})
	}
}

func Test_removeRep(t *testing.T) {
	type args struct {
		a []string
	}
	tests := []struct {
		name string
		args args
		want []string
	}{
		{"test01", args{
			a: []string{"123", "245", "345", "345"},
		}, []string{"123", "245", "345"}},
		{"test02", args{
			a: []string{"123", "245", "345", "123", "245", "345", "123", "245", "345"},
		}, []string{"123", "245", "345"}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := removeRep(tt.args.a); !reflect.DeepEqual(got, tt.want) {
				t.Errorf("removeRep() = %v, want %v", got, tt.want)
			}
		})
	}
}
