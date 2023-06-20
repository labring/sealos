package drivers

import (
	"testing"

	"github.com/labring/sealos/pkg/utils/logger"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	v1 "github.com/labring/sealos/controllers/infra/api/v1"
)

func TestDriver_createKeyPair(t *testing.T) {
	type args struct {
		infra *v1.Infra
	}
	tests := []struct {
		name    string
		args    args
		wantErr bool
	}{
		{
			"test create keypair",
			args{
				infra: &v1.Infra{
					TypeMeta: metav1.TypeMeta{},
					ObjectMeta: metav1.ObjectMeta{
						Name:      "sealos-infra",
						Namespace: "sealos-infra-ns",
						UID:       "0abafc31-735b-4a9c-923f-493af2ed1b25",
					},
					Spec: v1.InfraSpec{
						AvailabilityZone: "cn-hangzhou-i",
					},
				},
			},
			false,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			d, err := NewDriver("aliyun")
			if err != nil {
				t.Errorf("create driver failed: %v", err)
			}
			err = d.CreateKeyPair(tt.args.infra)
			if (err != nil) != tt.wantErr {
				t.Errorf("CreateKeypair() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			logger.Info("infra ssh: ", tt.args.infra.Spec.SSH)
		})
	}
}
