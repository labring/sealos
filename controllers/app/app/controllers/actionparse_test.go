package controllers

//import (
//	"github.com/labring/sealos/pkg/image/types"
//	v1 "github.com/opencontainers/image-spec/specs-go/v1"
//	"testing"
//)
//
//func TestMerge(t *testing.T) {
//	type args struct {
//		ociList types.ImageListOCIV1
//	}
//	tests := []struct {
//		name     string
//		args     args
//		wantErr  bool
//		wantData string
//	}{
//		{
//			name: "",
//			args: args{
//				ociList: []v1.Image{
//					{
//						Config: v1.ImageConfig{
//							Env:        []string{"aa=bb", "cc=dd", "ee=ff"},
//							Entrypoint: []string{"ffff"},
//							Cmd:        []string{"ffff"},
//							Labels:     map[string]string{"aa": "bb"},
//						},
//					},
//					{
//						Config: v1.ImageConfig{
//							Env:        []string{"ff=gg", "aa=dd"},
//							Entrypoint: []string{"eeee", "aaaa"},
//							Cmd:        []string{"eeee"},
//							Labels:     map[string]string{"aa": "cc", "bb": "cc"},
//						},
//					},
//				},
//			},
//			wantData: `FROM scratch
//MAINTAINER labring
//LABEL aa="cc"
//LABEL bb="cc"
//ENV aa=dd
//ENV cc=dd
//ENV ee=ff
//ENV ff=gg
//ENTRYPOINT ["eeee","aaaa"]
//CMD ["ffff","eeee"]
//COPY --from=aaaa  . .`,
//			wantErr: false,
//		},
//	}
//	for _, tt := range tests {
//		t.Run(tt.name, func(t *testing.T) {
//			if data, err := mergeMountPath(tt.args.ociList); (err != nil) != tt.wantErr {
//				t.Errorf("mergeMountPath() error = %v, wantErr %v", err, tt.wantErr)
//			} else {
//				if data != tt.wantData {
//					t.Errorf("mergeMountPath() data = %v, wantData %v", data, tt.wantData)
//				}
//			}
//		})
//	}
//}
