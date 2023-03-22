package image

import (
	"context"
	"fmt"
	"github.com/labring/image-cri-shim/pkg/types"
	"github.com/labring/sealos/pkg/utils/logger"
	"github.com/labring/sealos/test/e2e/testhelper"
	v1api "k8s.io/cri-api/pkg/apis/runtime/v1"
	"k8s.io/cri-api/pkg/apis/runtime/v1alpha2"
)

const V1 = "v1"
const V1alpha2 = "v1alpha2"

type FakeImageServiceClient struct {
	Version                    string
	AuthConfig                 map[string]types.AuthConfig
	V1ImageServiceClient       v1api.ImageServiceClient
	V1alpha2ImageServiceClient v1alpha2.ImageServiceClient
}

func NewFakeImageServiceClientWithV1(client v1api.ImageServiceClient, auth map[string]types.AuthConfig) FakeImageServiceClientInterface {
	return &FakeImageServiceClient{V1ImageServiceClient: client, AuthConfig: auth, Version: V1}
}

func NewFakeImageServiceClientWithV1alpha2(client v1alpha2.ImageServiceClient, auth map[string]types.AuthConfig) FakeImageServiceClientInterface {
	return &FakeImageServiceClient{V1alpha2ImageServiceClient: client, AuthConfig: auth, Version: V1alpha2}
}

type FakeImageServiceClientInterface interface {
	ListImages() ([]string, error)
	ImageStatus(image string) (*v1alpha2.ImageStatusResponse, error)
	//return image ID
	PullImage(image string) (string, error)
	RemoveImage(image string) error
	ImageFsInfo() ([]*v1alpha2.FilesystemUsage, error)
}

func (f FakeImageServiceClient) ListImages() ([]string, error) {
	var (
		ctx, cancel   = context.WithCancel(context.Background())
		imageListResp *v1alpha2.ListImagesResponse
		imageList     = []string{}
		err           error
	)
	defer cancel()
	if f.Version == V1 {
		v1ImageListResp, err := f.V1ImageServiceClient.ListImages(ctx, &v1api.ListImagesRequest{})
		if err != nil {
			return nil, err
		}
		imageListResp = ConvertV1ImageListRespToV1alpha2(v1ImageListResp)
	} else {
		imageListResp, err = f.V1alpha2ImageServiceClient.ListImages(ctx, &v1alpha2.ListImagesRequest{})
		if err != nil {
			return nil, err
		}
	}
	if imageListResp.Images == nil {
		logger.Info("images is nil: %#+v", imageListResp)
		return nil, nil
	}
	for i := range imageListResp.Images {
		image := imageListResp.Images[i].GetId()
		if imageListResp.Images[i].GetSpec() != nil {
			image = imageListResp.Images[i].GetSpec().GetImage()
		}
		imageList = append(imageList, image)
	}
	return imageList, nil
}

func (f FakeImageServiceClient) ImageStatus(image string) (*v1alpha2.ImageStatusResponse, error) {
	var (
		ctx, cancel     = context.WithCancel(context.Background())
		imageStatusResp *v1alpha2.ImageStatusResponse
		err             error
	)
	defer cancel()
	v1ImageSpec := &v1api.ImageSpec{Image: image}
	if f.Version == V1 {
		v1ImageListResp, err := f.V1ImageServiceClient.ImageStatus(ctx, &v1api.ImageStatusRequest{Image: v1ImageSpec, Verbose: true})
		if err != nil {
			return nil, err
		}
		imageStatusResp = ConvertV1ImageStatusResponseToV1alpha2(v1ImageListResp)
	} else {
		imageStatusResp, err = f.V1alpha2ImageServiceClient.ImageStatus(ctx, &v1alpha2.ImageStatusRequest{Image: ConvertV1ImageSpecToV1alpha2(v1ImageSpec), Verbose: true})
		if err != nil {
			return nil, err
		}
	}
	return imageStatusResp, nil
}

// return image ID
func (f FakeImageServiceClient) PullImage(image string) (string, error) {
	var (
		ctx, cancel   = context.WithCancel(context.Background())
		imagePullResp *v1alpha2.PullImageResponse
		err           error
	)
	defer cancel()
	v1ImageSpec := &v1api.ImageSpec{Image: image}
	if f.Version == V1 {
		v1ImageListResp, err := f.V1ImageServiceClient.PullImage(ctx, &v1api.PullImageRequest{Image: v1ImageSpec})
		if err != nil {
			return "", err
		}
		imagePullResp = ConvertV1PullImageResponseToV1alpha2(v1ImageListResp)
	} else {
		imagePullResp, err = f.V1alpha2ImageServiceClient.PullImage(ctx, &v1alpha2.PullImageRequest{Image: ConvertV1ImageSpecToV1alpha2(v1ImageSpec)})
		if err != nil {
			return "", err
		}
	}
	return imagePullResp.ImageRef, nil
}

func (f FakeImageServiceClient) RemoveImage(image string) error {
	var (
		ctx, cancel = context.WithCancel(context.Background())
		err         error
	)
	defer cancel()
	v1ImageSpec := &v1api.ImageSpec{Image: image}
	if f.Version == V1 {
		_, err := f.V1ImageServiceClient.RemoveImage(ctx, &v1api.RemoveImageRequest{Image: v1ImageSpec})
		if err != nil {
			return err
		}
	} else {
		_, err = f.V1alpha2ImageServiceClient.RemoveImage(ctx, &v1alpha2.RemoveImageRequest{Image: ConvertV1ImageSpecToV1alpha2(v1ImageSpec)})
	}
	return err
}

func (f FakeImageServiceClient) ImageFsInfo() ([]*v1alpha2.FilesystemUsage, error) {
	var (
		ctx, cancel     = context.WithCancel(context.Background())
		imageFsInfoResp *v1alpha2.ImageFsInfoResponse
		err             error
	)
	defer cancel()
	if f.Version == V1 {
		v1ImageListResp, err := f.V1ImageServiceClient.ImageFsInfo(ctx, &v1api.ImageFsInfoRequest{})
		if err != nil {
			return nil, err
		}
		imageFsInfoResp = ConvertV1ImageFsInfoResponseToV1alpha2(v1ImageListResp)
	} else {
		imageFsInfoResp, err = f.V1alpha2ImageServiceClient.ImageFsInfo(ctx, &v1alpha2.ImageFsInfoRequest{})
		if err != nil {
			return nil, err
		}
	}
	return imageFsInfoResp.ImageFilesystems, nil
}

func ConvertV1ImageListRespToV1alpha2(in *v1api.ListImagesResponse) (out *v1alpha2.ListImagesResponse) {
	data, err := in.Marshal()
	testhelper.CheckErr(err, fmt.Sprintf("failed to marshal v1 imageList data: %v", err))
	out = &v1alpha2.ListImagesResponse{}
	err = out.Unmarshal(data)
	testhelper.CheckErr(err, fmt.Sprintf("failed to unmarshal to v1aplha2 imageList: %v", err))
	return
}

func ConvertV1ImageStatusResponseToV1alpha2(in *v1api.ImageStatusResponse) (out *v1alpha2.ImageStatusResponse) {
	data, err := in.Marshal()
	testhelper.CheckErr(err, fmt.Sprintf("failed to marshal v1 ImageStatusResponse data: %v", err))
	out = &v1alpha2.ImageStatusResponse{}
	err = out.Unmarshal(data)
	testhelper.CheckErr(err, fmt.Sprintf("failed to unmarshal to v1aplha2 ImageStatusResponse : %v", err))
	return
}

func ConvertV1ImageSpecToV1alpha2(in *v1api.ImageSpec) (out *v1alpha2.ImageSpec) {
	data, err := in.Marshal()
	testhelper.CheckErr(err, fmt.Sprintf("failed to marshal v1 ImageSpec data: %v", err))
	out = &v1alpha2.ImageSpec{}
	err = out.Unmarshal(data)
	testhelper.CheckErr(err, fmt.Sprintf("failed to unmarshal to v1aplha2 ImageSpec: %v", err))
	return
}

func ConvertV1PullImageResponseToV1alpha2(in *v1api.PullImageResponse) (out *v1alpha2.PullImageResponse) {
	data, err := in.Marshal()
	testhelper.CheckErr(err, fmt.Sprintf("failed to marshal v1 PullImageResponse data: %v", err))
	out = &v1alpha2.PullImageResponse{}
	err = out.Unmarshal(data)
	testhelper.CheckErr(err, fmt.Sprintf("failed to unmarshal to v1aplha2 PullImageResponse: %v", err))
	return
}

func ConvertV1RemoveImageResponseToV1alpha2(in *v1api.RemoveImageResponse) (out *v1alpha2.RemoveImageResponse) {
	data, err := in.Marshal()
	testhelper.CheckErr(err, fmt.Sprintf("failed to marshal v1 RemoveImageResponse data: %v", err))
	out = &v1alpha2.RemoveImageResponse{}
	err = out.Unmarshal(data)
	testhelper.CheckErr(err, fmt.Sprintf("failed to unmarshal to v1aplha2 RemoveImageResponse: %v", err))
	return
}

func ConvertV1ImageFsInfoResponseToV1alpha2(in *v1api.ImageFsInfoResponse) (out *v1alpha2.ImageFsInfoResponse) {
	data, err := in.Marshal()
	testhelper.CheckErr(err, fmt.Sprintf("failed to marshal v1 ImageFsInfoResponse data: %v", err))
	out = &v1alpha2.ImageFsInfoResponse{}
	err = out.Unmarshal(data)
	testhelper.CheckErr(err, fmt.Sprintf("failed to unmarshal to v1aplha2 ImageFsInfoResponse: %v", err))
	return
}
