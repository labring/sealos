/*
Copyright 2022 cuisongliu@qq.com.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

package remote

import (
	"github.com/fanux/sealos/pkg/utils/contants"
	"testing"
)

func Test_sealctl_Cert(t *testing.T) {
	type args struct {
		altNames    []string
		nodeIP      string
		nodeName    string
		serviceCIRD string
		DNSDomain   string
	}
	tests := []struct {
		name    string
		args    args
		want    string
		wantErr bool
	}{
		{
			name: "default",
			args: args{
				altNames:    []string{"apiserver.cluster.doamin"},
				nodeIP:      "127.0.0.1",
				nodeName:    "localhost",
				serviceCIRD: "116.12.13.1",
				DNSDomain:   "",
			},
			want:    "sealctl cert \\\n\t --node-ip 127.0.0.1 --node-name localhost \\\n\t --service-cidr 116.12.13.1 \\\n\t --alt-names apiserver.cluster.doamin ",
			wantErr: false,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			s := &sealctl{}
			got, err := s.Cert(tt.args.altNames, tt.args.nodeIP, tt.args.nodeName, tt.args.serviceCIRD, tt.args.DNSDomain)
			if (err != nil) != tt.wantErr {
				t.Errorf("Cert() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if got != tt.want {
				t.Errorf("Cert() got = %v, want %v", got, tt.want)
			}
		})
	}
}

func Test_sealctl_Hostname(t *testing.T) {
	tests := []struct {
		name string
		want string
	}{
		{
			name: "defalut",
			want: "sealctl hostname",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			s := &sealctl{}
			if got := s.Hostname(); got != tt.want {
				t.Errorf("Hostname() = %v, want %v", got, tt.want)
			}
		})
	}
}

func Test_sealctl_HostsAdd(t *testing.T) {
	type args struct {
		host   string
		domain string
	}
	tests := []struct {
		name string
		args args
		want string
	}{
		{
			name: "default",
			args: args{
				host:   "127.0.0.1",
				domain: "apiserver.cluster.doamin",
			},
			want: "sealctl hosts add --ip 127.0.0.1  --domain apiserver.cluster.doamin",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			s := &sealctl{}
			if got := s.HostsAdd(tt.args.host, tt.args.domain); got != tt.want {
				t.Errorf("HostsAdd() = %v, want %v", got, tt.want)
			}
		})
	}
}

func Test_sealctl_HostsDelete(t *testing.T) {
	type args struct {
		domain string
	}
	tests := []struct {
		name string
		args args
		want string
	}{
		{
			name: "default",
			args: args{
				domain: "apiserver.cluster.domain",
			},
			want: "sealctl hosts delete  --domain apiserver.cluster.domain",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			s := &sealctl{}
			if got := s.HostsDelete(tt.args.domain); got != tt.want {
				t.Errorf("HostsDelete() = %v, want %v", got, tt.want)
			}
		})
	}
}

func Test_sealctl_IPVS(t *testing.T) {
	type args struct {
		vip     string
		masters []string
	}
	tests := []struct {
		name    string
		args    args
		want    string
		wantErr bool
	}{
		{
			name: "default",
			args: args{
				vip:     "10.0.79.2:6443",
				masters: []string{"127.0.0.1:6443"},
			},
			want:    "sealctl ipvs --vs 10.0.79.2:6443  --rs  127.0.0.1:6443  --health-path /healthz --health-schem https --run-once",
			wantErr: false,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			s := &sealctl{}
			got, err := s.IPVS(tt.args.vip, tt.args.masters)
			if (err != nil) != tt.wantErr {
				t.Errorf("IPVS() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if got != tt.want {
				t.Errorf("IPVS() got = %v, want %v", got, tt.want)
			}
		})
	}
}

func Test_sealctl_IsDocker(t *testing.T) {
	tests := []struct {
		name string
		want string
	}{
		{
			name: "default",
			want: "sealctl cri is-docker",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			s := &sealctl{}
			if got := s.IsDocker(); got != tt.want {
				t.Errorf("IsDocker() = %v, want %v", got, tt.want)
			}
		})
	}
}

func Test_sealctl_RouteAdd(t *testing.T) {
	type args struct {
		host    string
		gateway string
	}
	tests := []struct {
		name string
		args args
		want string
	}{
		{
			name: "default",
			args: args{
				host:    "127.0.0.2",
				gateway: "127.0.0.1",
			},
			want: "sealctl route add --host 127.0.0.2 --gateway 127.0.0.1",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			s := &sealctl{}
			if got := s.RouteAdd(tt.args.host, tt.args.gateway); got != tt.want {
				t.Errorf("RouteAdd() = %v, want %v", got, tt.want)
			}
		})
	}
}

func Test_sealctl_RouteCheck(t *testing.T) {
	type args struct {
		host string
	}
	tests := []struct {
		name string
		args args
		want string
	}{
		{
			name: "default",
			args: args{
				host: "127.0.0.1",
			},
			want: "sealctl route check --host 127.0.0.1",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			s := &sealctl{}
			if got := s.RouteCheck(tt.args.host); got != tt.want {
				t.Errorf("RouteCheck() = %v, want %v", got, tt.want)
			}
		})
	}
}

func Test_sealctl_RouteDelete(t *testing.T) {
	type args struct {
		host    string
		gateway string
	}
	tests := []struct {
		name string
		args args
		want string
	}{
		{
			name: "default",
			args: args{
				host:    "127.0.0.2",
				gateway: "127.0.0.1",
			},
			want: "sealctl route del --host 127.0.0.2 --gateway 127.0.0.1",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			s := &sealctl{}
			if got := s.RouteDelete(tt.args.host, tt.args.gateway); got != tt.want {
				t.Errorf("RouteDelete() = %v, want %v", got, tt.want)
			}
		})
	}
}

func Test_sealctl_StaticPod(t *testing.T) {
	type args struct {
		vip     string
		image   string
		masters []string
	}
	tests := []struct {
		name    string
		args    args
		want    string
		wantErr bool
	}{
		{
			name: "default",
			args: args{
				vip:     "10.0.79.2:6443",
				image:   "sealyun/lvscare:latest",
				masters: []string{"127.0.0.1:6443"},
			},
			want:    "sealctl static-pod lvscare --vip 10.0.79.2:6443 --image sealyun/lvscare:latest  --masters  127.0.0.1:6443",
			wantErr: false,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			s := &sealctl{}
			got, err := s.StaticPod(tt.args.vip,contants.LvsCareStaticPodName ,tt.args.image, tt.args.masters)
			if (err != nil) != tt.wantErr {
				t.Errorf("StaticPod() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if got != tt.want {
				t.Errorf("StaticPod() got = %v, want %v", got, tt.want)
			}
		})
	}
}

func Test_sealctl_Token(t *testing.T) {
	tests := []struct {
		name string
		want string
	}{
		{
			"default", "sealctl token",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			s := &sealctl{}
			if got := s.Token(); got != tt.want {
				t.Errorf("Token() = %v, want %v", got, tt.want)
			}
		})
	}
}
