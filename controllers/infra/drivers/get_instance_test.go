package drivers

import (
	"fmt"
	"testing"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	v1 "github.com/labring/sealos/controllers/infra/api/v1"
)

func TestDriver_GetInstancesByLabel(t *testing.T) {
	type args struct {
		key   string
		value string
		infra *v1.Infra
	}
	tests := []struct {
		name    string
		args    args
		want    *v1.Hosts
		wantErr bool
	}{
		{
			"test get instance",
			args{
				key:   "master",
				value: "true",
				infra: &v1.Infra{
					TypeMeta: metav1.TypeMeta{},
					ObjectMeta: metav1.ObjectMeta{
						Name:      "sealos-infra",
						Namespace: "sealos-infra-ns",
					},
				},
			},
			&v1.Hosts{
				Count: 1,
			},
			false,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			d, err := NewDriver("aws")
			if err != nil {
				t.Errorf("create driver failed: %v", err)
			}
			got, err := d.GetInstancesByLabel(tt.args.key, tt.args.value, tt.args.infra)
			if (err != nil) != tt.wantErr {
				t.Errorf("GetInstancesByLabel() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if got.Count != tt.want.Count {
				t.Errorf("GetInstancesByLabel() got = %v, want %v", got, tt.want)
			}
			fmt.Println("got hosts: ", got)
		})
	}
}
