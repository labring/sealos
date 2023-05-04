package image

import (
	"github.com/labring/sealos/test/e2e/testhelper/settings"
	"k8s.io/apimachinery/pkg/util/json"

	"github.com/labring/sealos/test/e2e/testhelper/cmd"
)

const (
	DockerTarFile = "/tmp/docker.tar"
	OCITarFile    = "/tmp/oci.tar"
)

type FakeImageInterface interface {
	ListImages() ([]DisplayImage, error)
	PullImage(image string) error
	RemoveImage(image string) error
	DockerArchiveImage(name string) error
	OCIArchiveImage(name string) error
	SaveImage(name, file string) error
	LoadImage(file string) error
	CreateImageDir(name string, short bool) error
	Merge(newImage string, images []string) error
}

type fakeClient struct {
	*cmd.SealosCmd
}

func NewFakeImage() FakeImageInterface {
	return &fakeClient{
		SealosCmd: cmd.NewSealosCmd(settings.E2EConfig.SealosBinPath, &cmd.LocalCmd{}),
	}
}

var _ FakeImageInterface = &fakeClient{}

type DisplayImage struct {
	ID           string   `json:"id"`
	Names        []string `json:"names"`
	Digest       string   `json:"digest"`
	Createdat    string   `json:"createdat"`
	Size         string   `json:"size"`
	Created      int      `json:"created"`
	Createdatraw string   `json:"createdatraw"`
	Readonly     bool     `json:"readonly"`
}

func (f *fakeClient) ListImages() ([]DisplayImage, error) {
	data, err := f.SealosCmd.Executor.Exec(f.SealosCmd.BinPath, "images", "--json")
	if err != nil {
		return nil, err
	}
	var images []DisplayImage
	err = json.Unmarshal(data, &images)
	return images, err
}

func (f *fakeClient) PullImage(image string) error {
	return f.SealosCmd.ImagePull(&cmd.PullOptions{
		ImageRefs: []string{image},
		Quiet:     true,
	})
}

func (f *fakeClient) RemoveImage(image string) error {
	return f.SealosCmd.ImageRemove(image)
}

func (f *fakeClient) DockerArchiveImage(name string) error {
	return f.SealosCmd.ImageSave(name, DockerTarFile, "docker-archive")
}

func (f *fakeClient) OCIArchiveImage(name string) error {
	return f.SealosCmd.ImageSave(name, OCITarFile, "oci-archive")
}

func (f *fakeClient) SaveImage(name, file string) error {
	return f.SealosCmd.ImageSave(name, file, "")
}

func (f *fakeClient) LoadImage(file string) error {
	return f.SealosCmd.ImageLoad(file)
}

func (f *fakeClient) CreateImageDir(name string, short bool) error {
	return f.SealosCmd.Create(&cmd.CreateOptions{
		Short: short,
		Image: name,
	})
}

func (f *fakeClient) Merge(newImage string, images []string) error {
	return f.SealosCmd.ImageMerge(&cmd.MergeOptions{
		Tag:       []string{newImage},
		ImageRefs: images,
	})
}
