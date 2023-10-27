package account

import "testing"

func TestGetNameByNameSpace(t *testing.T) {
	type args struct {
		ns string
	}
	tests := []struct {
		name string
		args args
		want string
	}{
		{
			name: "test1",
			args: args{
				ns: "ns-123",
			},
			want: "123",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := GetNameByNameSpace(tt.args.ns); got != tt.want {
				t.Errorf("GetNameByNameSpace() = %v, want %v", got, tt.want)
			}
		})
	}
}
