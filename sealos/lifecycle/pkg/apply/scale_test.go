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

package apply

import (
	"testing"

	"github.com/spf13/cobra"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	v2 "github.com/labring/sealos/pkg/types/v1beta1"
)

func TestDelete(t *testing.T) {
	type args struct {
		cluster   *v2.Cluster
		scaleArgs *ScaleArgs
	}
	tests := []struct {
		name    string
		args    args
		wantErr bool
	}{
		{
			name: "delete empty",
			args: args{
				cluster: &v2.Cluster{
					TypeMeta:   metav1.TypeMeta{},
					ObjectMeta: metav1.ObjectMeta{},
					Spec: v2.ClusterSpec{
						Image: nil,
						SSH: v2.SSH{
							User:   "root",
							Passwd: "Fanux#123",
							Port:   22,
						},
						Hosts: []v2.Host{
							{
								IPS:   []string{"192.168.16.99:22", "192.168.16.98:22", "192.168.16.97:22"},
								Roles: []string{v2.MASTER},
							},
							{
								IPS:   []string{"192.168.16.1:22", "192.168.16.2:22", "192.168.16.3:22", "192.168.16.4:22"},
								Roles: []string{v2.NODE},
							},
						},
					},
					Status: v2.ClusterStatus{},
				},
				scaleArgs: &ScaleArgs{
					Cluster: &Cluster{
						Masters:     "",
						Nodes:       "",
						ClusterName: "",
					},
				},
			},
			wantErr: false,
		},
		{
			name: "delete master0",
			args: args{
				cluster: &v2.Cluster{
					TypeMeta:   metav1.TypeMeta{},
					ObjectMeta: metav1.ObjectMeta{},
					Spec: v2.ClusterSpec{
						Image: nil,
						SSH: v2.SSH{
							User:   "root",
							Passwd: "Fanux#123",
							Port:   22,
						},
						Hosts: []v2.Host{
							{
								IPS:   []string{"192.168.16.99:22", "192.168.16.98:22", "192.168.16.97:22"},
								Roles: []string{v2.MASTER},
							},
							{
								IPS:   []string{"192.168.16.1:22", "192.168.16.2:22", "192.168.16.3:22", "192.168.16.4:22"},
								Roles: []string{v2.NODE},
							},
						},
					},
					Status: v2.ClusterStatus{},
				},
				scaleArgs: &ScaleArgs{
					Cluster: &Cluster{
						Masters:     "192.168.16.99",
						Nodes:       "",
						ClusterName: "",
					},
				},
			},
			wantErr: true,
		},
		{
			name: "delete range",
			args: args{
				cluster: &v2.Cluster{
					TypeMeta:   metav1.TypeMeta{},
					ObjectMeta: metav1.ObjectMeta{},
					Spec: v2.ClusterSpec{
						Image: nil,
						SSH: v2.SSH{
							User:   "root",
							Passwd: "Fanux#123",
							Port:   22,
						},
						Hosts: []v2.Host{
							{
								IPS:   []string{"192.168.16.99:22", "192.168.16.98:22", "192.168.16.97:22"},
								Roles: []string{v2.MASTER},
							},
							{
								IPS:   []string{"192.168.16.1:22", "192.168.16.2:22", "192.168.16.3:22", "192.168.16.4:22"},
								Roles: []string{v2.NODE},
							},
						},
					},
					Status: v2.ClusterStatus{},
				},
				scaleArgs: &ScaleArgs{
					Cluster: &Cluster{
						Masters:     "192.168.16.97-192.168.16.98",
						Nodes:       "",
						ClusterName: "",
					},
				},
			},
			wantErr: false,
		},
		{
			name: "delete ip",
			args: args{
				cluster: &v2.Cluster{
					TypeMeta:   metav1.TypeMeta{},
					ObjectMeta: metav1.ObjectMeta{},
					Spec: v2.ClusterSpec{
						Image: nil,
						SSH: v2.SSH{
							User:   "root",
							Passwd: "Fanux#123",
							Port:   22,
						},
						Hosts: []v2.Host{
							{
								IPS:   []string{"192.168.16.99:22", "192.168.16.98:22", "192.168.16.97:22"},
								Roles: []string{v2.MASTER},
							},
							{
								IPS:   []string{"192.168.16.1:22", "192.168.16.2:22", "192.168.16.3:22", "192.168.16.4:22"},
								Roles: []string{v2.NODE},
							},
						},
					},
					Status: v2.ClusterStatus{},
				},
				scaleArgs: &ScaleArgs{
					Cluster: &Cluster{
						Masters:     "192.168.16.97",
						Nodes:       "",
						ClusterName: "",
					},
				},
			},
			wantErr: false,
		},
		{
			name: "delete ip and port",
			args: args{
				cluster: &v2.Cluster{
					TypeMeta:   metav1.TypeMeta{},
					ObjectMeta: metav1.ObjectMeta{},
					Spec: v2.ClusterSpec{
						Image: nil,
						SSH: v2.SSH{
							User:   "root",
							Passwd: "Fanux#123",
							Port:   22,
						},
						Hosts: []v2.Host{
							{
								IPS:   []string{"192.168.16.99:22", "192.168.16.98:22", "192.168.16.97:22"},
								Roles: []string{v2.MASTER},
							},
							{
								IPS:   []string{"192.168.16.1:22", "192.168.16.2:22", "192.168.16.3:22", "192.168.16.4:22"},
								Roles: []string{v2.NODE},
							},
						},
					},
					Status: v2.ClusterStatus{},
				},
				scaleArgs: &ScaleArgs{
					Cluster: &Cluster{
						Masters:     "192.168.16.97:22",
						Nodes:       "",
						ClusterName: "",
					},
				},
			},
			wantErr: false,
		},
		{
			name: "delete ip and port error",
			args: args{
				cluster: &v2.Cluster{
					TypeMeta:   metav1.TypeMeta{},
					ObjectMeta: metav1.ObjectMeta{},
					Spec: v2.ClusterSpec{
						Image: nil,
						SSH: v2.SSH{
							User:   "root",
							Passwd: "Fanux#123",
							Port:   22,
						},
						Hosts: []v2.Host{
							{
								IPS:   []string{"192.168.16.99:22", "192.168.16.98:22", "192.168.16.97:22"},
								Roles: []string{v2.MASTER},
							},
							{
								IPS:   []string{"192.168.16.1:22", "192.168.16.2:22", "192.168.16.3:22", "192.168.16.4:22"},
								Roles: []string{v2.NODE},
							},
						},
					},
					Status: v2.ClusterStatus{},
				},
				scaleArgs: &ScaleArgs{
					Cluster: &Cluster{
						Masters:     "192.168.16.97:2222",
						Nodes:       "",
						ClusterName: "",
					},
				},
			},
			wantErr: true,
		},
		{
			name: "delete range ip and port",
			args: args{
				cluster: &v2.Cluster{
					TypeMeta:   metav1.TypeMeta{},
					ObjectMeta: metav1.ObjectMeta{},
					Spec: v2.ClusterSpec{
						Image: nil,
						SSH: v2.SSH{
							User:   "root",
							Passwd: "Fanux#123",
							Port:   22,
						},
						Hosts: []v2.Host{
							{
								IPS:   []string{"192.168.16.99:22", "192.168.16.98:22", "192.168.16.97:22"},
								Roles: []string{v2.MASTER},
							},
							{
								IPS:   []string{"192.168.16.1:22", "192.168.16.2:22", "192.168.16.3:22", "192.168.16.4:22"},
								Roles: []string{v2.NODE},
							},
						},
					},
					Status: v2.ClusterStatus{},
				},
				scaleArgs: &ScaleArgs{
					Cluster: &Cluster{
						Masters:     "192.168.16.97:22-192.168.16.98:22",
						Nodes:       "",
						ClusterName: "",
					},
				},
			},
			wantErr: true,
		},
		{
			name: "delete range",
			args: args{
				cluster: &v2.Cluster{
					TypeMeta:   metav1.TypeMeta{},
					ObjectMeta: metav1.ObjectMeta{},
					Spec: v2.ClusterSpec{
						Image: nil,
						SSH: v2.SSH{
							User:   "root",
							Passwd: "Fanux#123",
							Port:   22,
						},
						Hosts: []v2.Host{
							{
								IPS:   []string{"192.168.16.99:22", "192.168.16.98:22", "192.168.16.97:22"},
								Roles: []string{v2.MASTER},
							},
							{
								IPS:   []string{"192.168.16.1:22", "192.168.16.2:22", "192.168.16.3:22", "192.168.16.4:22"},
								Roles: []string{v2.NODE},
							},
						},
					},
					Status: v2.ClusterStatus{},
				},
				scaleArgs: &ScaleArgs{
					Cluster: &Cluster{
						Masters:     "192.168.16.1-192.168.16.3",
						Nodes:       "",
						ClusterName: "",
					},
				},
			},
			wantErr: false,
		},
		{
			name: "delete ip",
			args: args{
				cluster: &v2.Cluster{
					TypeMeta:   metav1.TypeMeta{},
					ObjectMeta: metav1.ObjectMeta{},
					Spec: v2.ClusterSpec{
						Image: nil,
						SSH: v2.SSH{
							User:   "root",
							Passwd: "Fanux#123",
							Port:   22,
						},
						Hosts: []v2.Host{
							{
								IPS:   []string{"192.168.16.99:22", "192.168.16.98:22", "192.168.16.97:22"},
								Roles: []string{v2.MASTER},
							},
							{
								IPS:   []string{"192.168.16.1:22", "192.168.16.2:22", "192.168.16.3:22", "192.168.16.4:22"},
								Roles: []string{v2.NODE},
							},
						},
					},
					Status: v2.ClusterStatus{},
				},
				scaleArgs: &ScaleArgs{
					Cluster: &Cluster{
						Masters:     "192.168.16.1",
						Nodes:       "",
						ClusterName: "",
					},
				},
			},
			wantErr: false,
		},
		{
			name: "delete ip and port",
			args: args{
				cluster: &v2.Cluster{
					TypeMeta:   metav1.TypeMeta{},
					ObjectMeta: metav1.ObjectMeta{},
					Spec: v2.ClusterSpec{
						Image: nil,
						SSH: v2.SSH{
							User:   "root",
							Passwd: "Fanux#123",
							Port:   22,
						},
						Hosts: []v2.Host{
							{
								IPS:   []string{"192.168.16.99:22", "192.168.16.98:22", "192.168.16.97:22"},
								Roles: []string{v2.MASTER},
							},
							{
								IPS:   []string{"192.168.16.1:22", "192.168.16.2:22", "192.168.16.3:22", "192.168.16.4:22"},
								Roles: []string{v2.NODE},
							},
						},
					},
					Status: v2.ClusterStatus{},
				},
				scaleArgs: &ScaleArgs{
					Cluster: &Cluster{
						Masters:     "192.168.16.1:22",
						Nodes:       "",
						ClusterName: "",
					},
				},
			},
			wantErr: false,
		},
		{
			name: "delete range ip and port",
			args: args{
				cluster: &v2.Cluster{
					TypeMeta:   metav1.TypeMeta{},
					ObjectMeta: metav1.ObjectMeta{},
					Spec: v2.ClusterSpec{
						Image: nil,
						SSH: v2.SSH{
							User:   "root",
							Passwd: "Fanux#123",
							Port:   22,
						},
						Hosts: []v2.Host{
							{
								IPS:   []string{"192.168.16.99:22", "192.168.16.98:22", "192.168.16.97:22"},
								Roles: []string{v2.MASTER},
							},
							{
								IPS:   []string{"192.168.16.1:22", "192.168.16.2:22", "192.168.16.3:22", "192.168.16.4:22"},
								Roles: []string{v2.NODE},
							},
						},
					},
					Status: v2.ClusterStatus{},
				},
				scaleArgs: &ScaleArgs{
					Cluster: &Cluster{
						Masters:     "192.168.16.97:1-192.168.16.2:22",
						Nodes:       "",
						ClusterName: "",
					},
				},
			},
			wantErr: true,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := Delete(tt.args.cluster, tt.args.scaleArgs)
			if (err != nil) != tt.wantErr {
				t.Errorf("Delete() error = %v, wantErr %v", err, tt.wantErr)
			}
			t.Logf("print des cluster hosts: %v", tt.args.cluster.Spec.Hosts)
		})
	}
}

func TestJoin(t *testing.T) {
	type args struct {
		cluster     *v2.Cluster
		scalingArgs *ScaleArgs
	}
	tests := []struct {
		name    string
		args    args
		wantErr bool
	}{
		{
			name: "add empty",
			args: args{
				cluster: &v2.Cluster{
					TypeMeta:   metav1.TypeMeta{},
					ObjectMeta: metav1.ObjectMeta{},
					Spec: v2.ClusterSpec{
						Image: nil,
						SSH: v2.SSH{
							User:   "root",
							Passwd: "Fanux#123",
							Port:   22,
						},
						Hosts: []v2.Host{
							{
								IPS:   []string{"192.168.16.99:22", "192.168.16.98:22", "192.168.16.97:22"},
								Roles: []string{v2.MASTER},
							},
							{
								IPS:   []string{"192.168.16.1:22", "192.168.16.2:22", "192.168.16.3:22", "192.168.16.4:22"},
								Roles: []string{v2.NODE},
							},
						},
					},
					Status: v2.ClusterStatus{},
				},
				scalingArgs: &ScaleArgs{
					Cluster: &Cluster{
						Masters:     "",
						Nodes:       "",
						ClusterName: "",
					},
				},
			},
			wantErr: false,
		},
		{
			name: "add masters",
			args: args{
				cluster: &v2.Cluster{
					TypeMeta:   metav1.TypeMeta{},
					ObjectMeta: metav1.ObjectMeta{},
					Spec: v2.ClusterSpec{
						Image: nil,
						SSH: v2.SSH{
							User:   "root",
							Passwd: "Fanux#123",
							Port:   22,
						},
						Hosts: []v2.Host{
							{
								IPS:   []string{"192.168.16.99:22", "192.168.16.98:22", "192.168.16.97:22"},
								Roles: []string{v2.MASTER},
							},
							{
								IPS:   []string{"192.168.16.1:22", "192.168.16.2:22", "192.168.16.3:22", "192.168.16.4:22"},
								Roles: []string{v2.NODE},
							},
						},
					},
					Status: v2.ClusterStatus{},
				},
				scalingArgs: &ScaleArgs{
					Cluster: &Cluster{
						Masters:     "192.168.16.96",
						Nodes:       "",
						ClusterName: "",
					},
				},
			},
			wantErr: false,
		},
		{
			name: "add masters port",
			args: args{
				cluster: &v2.Cluster{
					TypeMeta:   metav1.TypeMeta{},
					ObjectMeta: metav1.ObjectMeta{},
					Spec: v2.ClusterSpec{
						Image: nil,
						SSH: v2.SSH{
							User:   "root",
							Passwd: "Fanux#123",
							Port:   22,
						},
						Hosts: []v2.Host{
							{
								IPS:   []string{"192.168.16.99:22", "192.168.16.98:22", "192.168.16.97:22"},
								Roles: []string{v2.MASTER},
							},
							{
								IPS:   []string{"192.168.16.1:22", "192.168.16.2:22", "192.168.16.3:22", "192.168.16.4:22"},
								Roles: []string{v2.NODE},
							},
						},
					},
					Status: v2.ClusterStatus{},
				},
				scalingArgs: &ScaleArgs{
					Cluster: &Cluster{
						Masters:     "192.168.16.96:2222",
						Nodes:       "",
						ClusterName: "",
					},
				},
			},
			wantErr: false,
		},
		{
			name: "add masters range",
			args: args{
				cluster: &v2.Cluster{
					TypeMeta:   metav1.TypeMeta{},
					ObjectMeta: metav1.ObjectMeta{},
					Spec: v2.ClusterSpec{
						Image: nil,
						SSH: v2.SSH{
							User:   "root",
							Passwd: "Fanux#123",
							Port:   22,
						},
						Hosts: []v2.Host{
							{
								IPS:   []string{"192.168.16.99:22", "192.168.16.98:22", "192.168.16.97:22"},
								Roles: []string{v2.MASTER},
							},
							{
								IPS:   []string{"192.168.16.1:22", "192.168.16.2:22", "192.168.16.3:22", "192.168.16.4:22"},
								Roles: []string{v2.NODE},
							},
						},
					},
					Status: v2.ClusterStatus{},
				},
				scalingArgs: &ScaleArgs{
					Cluster: &Cluster{
						Masters:     "192.168.16.90-192.168.16.93",
						Nodes:       "",
						ClusterName: "",
					},
				},
			},
			wantErr: false,
		},
		{
			name: "add nodes range",
			args: args{
				cluster: &v2.Cluster{
					TypeMeta:   metav1.TypeMeta{},
					ObjectMeta: metav1.ObjectMeta{},
					Spec: v2.ClusterSpec{
						Image: nil,
						SSH: v2.SSH{
							User:   "root",
							Passwd: "Fanux#123",
							Port:   22,
						},
						Hosts: []v2.Host{
							{
								IPS:   []string{"192.168.16.99:22", "192.168.16.98:22", "192.168.16.97:22"},
								Roles: []string{v2.MASTER},
							},
							{
								IPS:   []string{"192.168.16.1:22", "192.168.16.2:22", "192.168.16.3:22", "192.168.16.4:22"},
								Roles: []string{v2.NODE},
							},
						},
					},
					Status: v2.ClusterStatus{},
				},
				scalingArgs: &ScaleArgs{
					Cluster: &Cluster{
						Masters:     "",
						Nodes:       "192.168.16.90-192.168.16.93",
						ClusterName: "",
					},
				},
			},
			wantErr: false,
		},
		{
			name: "add nodes range port",
			args: args{
				cluster: &v2.Cluster{
					TypeMeta:   metav1.TypeMeta{},
					ObjectMeta: metav1.ObjectMeta{},
					Spec: v2.ClusterSpec{
						Image: nil,
						SSH: v2.SSH{
							User:   "root",
							Passwd: "Fanux#123",
							Port:   22,
						},
						Hosts: []v2.Host{
							{
								IPS:   []string{"192.168.16.99:22", "192.168.16.98:22", "192.168.16.97:22"},
								Roles: []string{v2.MASTER},
							},
							{
								IPS:   []string{"192.168.16.1:22", "192.168.16.2:22", "192.168.16.3:22", "192.168.16.4:22"},
								Roles: []string{v2.NODE},
							},
						},
					},
					Status: v2.ClusterStatus{},
				},
				scalingArgs: &ScaleArgs{
					Cluster: &Cluster{
						Masters:     "",
						Nodes:       "192.168.16.90:22-192.168.16.93:22",
						ClusterName: "",
					},
				},
			},
			wantErr: true,
		},
		{
			name: "add nodes",
			args: args{
				cluster: &v2.Cluster{
					TypeMeta:   metav1.TypeMeta{},
					ObjectMeta: metav1.ObjectMeta{},
					Spec: v2.ClusterSpec{
						Image: nil,
						SSH: v2.SSH{
							User:   "root",
							Passwd: "Fanux#123",
							Port:   22,
						},
						Hosts: []v2.Host{
							{
								IPS:   []string{"192.168.16.99:22", "192.168.16.98:22", "192.168.16.97:22"},
								Roles: []string{v2.MASTER},
							},
							{
								IPS:   []string{"192.168.16.1:22", "192.168.16.2:22", "192.168.16.3:22", "192.168.16.4:22"},
								Roles: []string{v2.NODE},
							},
						},
					},
					Status: v2.ClusterStatus{},
				},
				scalingArgs: &ScaleArgs{
					Cluster: &Cluster{
						Masters:     "",
						Nodes:       "192.168.16.90",
						ClusterName: "",
					},
				},
			},
			wantErr: false,
		},
		{
			name: "add nodes port",
			args: args{
				cluster: &v2.Cluster{
					TypeMeta:   metav1.TypeMeta{},
					ObjectMeta: metav1.ObjectMeta{},
					Spec: v2.ClusterSpec{
						Image: nil,
						SSH: v2.SSH{
							User:   "root",
							Passwd: "Fanux#123",
							Port:   22,
						},
						Hosts: []v2.Host{
							{
								IPS:   []string{"192.168.16.99:22", "192.168.16.98:22", "192.168.16.97:22"},
								Roles: []string{v2.MASTER},
							},
							{
								IPS:   []string{"192.168.16.1:22", "192.168.16.2:22", "192.168.16.3:22", "192.168.16.4:22"},
								Roles: []string{v2.NODE},
							},
						},
					},
					Status: v2.ClusterStatus{},
				},
				scalingArgs: &ScaleArgs{
					Cluster: &Cluster{
						Masters:     "",
						Nodes:       "192.168.16.90:22",
						ClusterName: "",
					},
				},
			},
			wantErr: false,
		},
		{
			name: "add masters with different password",
			args: args{
				cluster: &v2.Cluster{
					TypeMeta:   metav1.TypeMeta{},
					ObjectMeta: metav1.ObjectMeta{},
					Spec: v2.ClusterSpec{
						Image: nil,
						SSH: v2.SSH{
							User:   "root",
							Passwd: "Fanux#123",
							Port:   22,
						},
						Hosts: []v2.Host{
							{
								IPS:   []string{"192.168.16.99:22", "192.168.16.98:22", "192.168.16.97:22"},
								Roles: []string{v2.MASTER},
							},
							{
								IPS:   []string{"192.168.16.1:22", "192.168.16.2:22", "192.168.16.3:22", "192.168.16.4:22"},
								Roles: []string{v2.NODE},
							},
						},
					},
					Status: v2.ClusterStatus{},
				},
				scalingArgs: &ScaleArgs{
					Cluster: &Cluster{
						Masters:     "192.168.16.5:22",
						Nodes:       "",
						ClusterName: "",
					},
					SSH: &SSH{
						User:     "root",
						Password: "Fanux@1234",
						Port:     22,
					},
				},
			},
			wantErr: false,
		},
		{
			name: "add nodes with different password",
			args: args{
				cluster: &v2.Cluster{
					TypeMeta:   metav1.TypeMeta{},
					ObjectMeta: metav1.ObjectMeta{},
					Spec: v2.ClusterSpec{
						Image: nil,
						SSH: v2.SSH{
							User:   "root",
							Passwd: "Fanux#123",
							Port:   22,
						},
						Hosts: []v2.Host{
							{
								IPS:   []string{"192.168.16.99:22", "192.168.16.98:22", "192.168.16.97:22"},
								Roles: []string{v2.MASTER},
							},
							{
								IPS:   []string{"192.168.16.1:22", "192.168.16.2:22", "192.168.16.3:22", "192.168.16.4:22"},
								Roles: []string{v2.NODE},
							},
						},
					},
					Status: v2.ClusterStatus{},
				},
				scalingArgs: &ScaleArgs{
					Cluster: &Cluster{
						Masters:     "",
						Nodes:       "192.168.16.90:22",
						ClusterName: "",
					},
					SSH: &SSH{
						User:     "root",
						Password: "Fanux@1234",
						Port:     22,
					},
				},
			},
			wantErr: false,
		},
	}

	var addCmd = &cobra.Command{
		Use: "add",
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if err := verifyAndSetNodes(addCmd, tt.args.cluster, tt.args.scalingArgs); (err != nil) != tt.wantErr {
				t.Errorf("Join() error = %v, wantErr %v", err, tt.wantErr)
			}
			t.Logf("print des cluster hosts: %v", tt.args.cluster.Spec.Hosts)
		})
	}
}
