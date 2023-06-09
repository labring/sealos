package versionutil

import "testing"

func TestCompare(t *testing.T) {
	type args struct {
		v1 string
		v2 string
	}
	tests := []struct {
		name string
		args args
		want bool
	}{
		{
			name: "v1 greater than v2",
			args: args{
				v1: "v1.25.2",
				v2: "v1.25.1",
			},
			want: true,
		}, {
			name: "v1 less than v2",
			args: args{
				v1: "v1.25.8",
				v2: "v1.25.10",
			},
			want: false,
		},
		{
			name: "v1 equal v2",
			args: args{
				v1: "v1.25.8",
				v2: "v1.25.8",
			},
			want: true,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := Compare(tt.args.v1, tt.args.v2); got != tt.want {
				t.Errorf("Compare() = %v, want %v", got, tt.want)
			}
		})
	}
}
