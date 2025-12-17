package query

import (
	"testing"
)

func TestEscapeSingleQuoted(t *testing.T) {
	type args struct {
		s string
	}
	tests := []struct {
		name string
		args args
		want string
	}{
		{
			name: "empty string",
			args: args{s: ""},
			want: "",
		},
		{
			name: "normal string without escape",
			args: args{s: "hello world"},
			want: "hello world",
		},
		{
			name: "string with single quote",
			args: args{s: "it's a test"},
			want: `it\'s a test`,
		},
		{
			name: "string with backslash",
			args: args{s: `path\to\file`},
			want: `path\\to\\file`,
		},
		{
			name: "string with both backslash and single quote",
			args: args{s: `it's a path\file`},
			want: `it\'s a path\\file`,
		},
		{
			name: "multiple single quotes",
			args: args{s: "'''"},
			want: `\'\'\'`,
		},
		{
			name: "multiple backslashes",
			args: args{s: `\\\`},
			want: `\\\\\\`,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := EscapeSingleQuoted(tt.args.s); got != tt.want {
				t.Errorf("EscapeSingleQuoted() = %v, want %v", got, tt.want)
			}
		})
	}
}
