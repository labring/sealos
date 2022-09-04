package applier

import (
	"testing"

	cv1 "github.com/labring/sealos/controllers/cluster/api/v1"
	v1 "github.com/labring/sealos/controllers/infra/api/v1"
	"github.com/labring/sealos/pkg/types/v1beta1"
)

func TestApplier_ReconcileCluster(t *testing.T) {
	type args struct {
		infra   *v1.Infra
		hosts   []v1.Hosts
		cluster *cv1.Cluster
	}
	hosts := []v1.Hosts{
		{
			Roles: []string{"master"},
		},
	}
	cluster := &cv1.Cluster{
		Spec: cv1.ClusterSpec{
			Images: []string{"labring/kubernetes:v1.24.0", "labring/calico:v3.22.1"},
		},
	}
	tests := []struct {
		name    string
		args    args
		wantErr bool
	}{
		{
			"test for apply cluster",
			args{
				infra: &v1.Infra{Spec: v1.InfraSpec{SSH: v1beta1.SSH{
					User:   "ec2-user",
					Passwd: "123456",
					Pk:     "/root/hurz_key.pem",
					Port:   uint16(22),
				}}},
				hosts:   hosts,
				cluster: cluster,
			},
			false,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			a := &Applier{}
			if err := a.ReconcileCluster(tt.args.infra, tt.args.hosts, tt.args.cluster); (err != nil) != tt.wantErr {
				t.Errorf("ReconcileCluster() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}
