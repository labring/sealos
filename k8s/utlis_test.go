// Copyright © 2021 sealos.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package k8s

import (
	"reflect"
	"regexp"
	"strconv"
	"strings"
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

func Test_removeByUse(t *testing.T) {
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
			if got := func(a []string, b string) []string {
				if len(a) == 0 {
					return a
				}
				res := a[:0]
				for _, v := range a {
					if v != b {
						res = append(res, v)
					}
				}
				return res
			}(tt.args.a, tt.args.b); !reflect.DeepEqual(got, tt.want) {
				t.Errorf("remove() = %v, want %v", got, tt.want)
			}
		})
	}
}

func Benchmark_remove(b *testing.B) {
	b.ResetTimer()
	origin := []string{"123", "245", "345", "123", "245", "345", "123", "245", "345"}
	for i := 0; i < b.N; i++ {
		remove(origin, "123")
	}
}

func Benchmark_removeByUse(b *testing.B) {
	b.ResetTimer()
	origin := []string{"123", "245", "345", "123", "245", "345", "123", "245", "345"}
	for i := 0; i < b.N; i++ {
		func(a []string, b string) []string {
			if len(a) == 0 {
				return a
			}
			res := a[:0]
			for _, v := range a {
				if v != b {
					res = append(res, v)
				}
			}
			return res
		}(origin, "123")
	}
}

func Benchmark_removeRep(b *testing.B) {
	b.ResetTimer()
	origin := []string{"123", "245", "345", "123", "245", "345", "123", "245", "345"}
	for i := 0; i < b.N; i++ {
		removeRep(origin)
	}
}

func BenchmarkIsIpv4(b *testing.B) {
	b.ResetTimer()
	const origin = "192.168.00.1"
	for i := 0; i < b.N; i++ {
		IsIpv4(origin)
	}
}

func BenchmarkIsIpv42(b *testing.B) {
	b.ResetTimer()
	origin := "192.168.00.1"
	for i := 0; i < b.N; i++ {
		_, _ = regexp.MatchString("((2(5[0-5]|[0-4]\\d))|[0-1]?\\d{1,2})(\\.((2(5[0-5]|[0-4]\\d))|[0-1]?\\d{1,2})){3}", origin) //nolint:staticcheck
	}
}

func BenchmarkIsIpv43(b *testing.B) {
	b.ResetTimer()
	origin := "192.168.00.1"
	for i := 0; i < b.N; i++ {
		func(ip string) bool {
			strs := strings.Split(ip, ".")
			if len(strs) != 4 {
				return false
			}
			for _, s := range strs {
				if len(s) == 0 || (len(s) > 1 && s[0] == '0') {
					return false
				}
				if s[0] < '0' || s[0] > '9' {
					return false
				}
				n, err := strconv.Atoi(s)
				if err != nil {
					return false
				}
				if n < 0 || n > 255 {
					return false
				}
			}
			return true
		}(origin)
	}
}
