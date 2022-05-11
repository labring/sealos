/*
@Date: 2022/5/11 11:44
@Author: Yao
@File : registry
@Software: GoLand
@Description: 这是一个描述
*/
package buildahsdk

import (
	"context"
	"fmt"
	"github.com/labring/sealos/pkg/image/types"

	"github.com/containers/buildah"
)

type RegistryService struct {
}

func (*RegistryService) Login(domain, username, passwd string) error {
	return nil
}

func (*RegistryService) Logout(domain string) error {
	return nil
}

func (*RegistryService) Pull(images ...string) error {
	opts := buildah.PullOptions{}
	for _, image := range images {
		imageId, err := buildah.Pull(context.Background(), image, opts)
		if err != nil {
			return err
		}
		fmt.Println(imageId)
	}

	return nil
}

func (*RegistryService) Push(image string) error {
	return nil
}

func NewRegistryService() (types.RegistryService, error) {
	return &RegistryService{}, nil
}
