package image

import (
	"strings"

	"k8s.io/apimachinery/pkg/util/json"

	"github.com/labring/sealos/test/e2e/testhelper/settings"

	"github.com/labring/sealos/test/e2e/testhelper/cmd"
)

const (
	DockerTarFile = "/tmp/docker.tar"
	OCITarFile    = "/tmp/oci.tar"
)

type FakeImageInterface interface {
	ListImages(display bool) ([]DisplayImage, error)
	PullImage(images ...string) error
	BuildImage(image, context string, opts BuildOptions) error
	RemoveImage(images ...string) error
	DockerArchiveImage(name string) error
	OCIArchiveImage(name string) error
	SaveImage(name, file string) error
	LoadImage(file string) error
	Create(name string, short bool) ([]byte, error)
	Merge(newImage string, images []string) error
	FetchImageID(name string) (string, error)
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

func (f *fakeClient) ListImages(display bool) ([]DisplayImage, error) {
	if display {
		return nil, f.SealosCmd.ImageList()
	}
	data, err := f.SealosCmd.Executor.Exec(f.SealosCmd.BinPath, "images", "--json")
	if err != nil {
		return nil, err
	}
	var images []DisplayImage
	err = json.Unmarshal(data, &images)
	return images, err
}

func (f *fakeClient) PullImage(images ...string) error {
	return f.SealosCmd.ImagePull(&cmd.PullOptions{
		ImageRefs: images,
		Quiet:     true,
	})
}

func (f *fakeClient) RemoveImage(images ...string) error {
	return f.SealosCmd.ImageRemove(images...)
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

func (f *fakeClient) Create(name string, short bool) ([]byte, error) {
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

func (f *fakeClient) FetchImageID(name string) (string, error) {
	data, err := f.SealosCmd.Executor.Exec(f.BinPath, "images", "-q", name)
	if err != nil {
		return "", err
	}
	return strings.TrimSpace(string(data)), nil
}
func (f *fakeClient) BuildImage(image, context string, opts BuildOptions) error {
	return f.SealosCmd.Build(&cmd.BuildOptions{
		Tag:          image,
		SaveImage:    opts.SaveImage,
		Context:      context,
		Compress:     opts.Compress,
		MaxPullProcs: opts.MaxPullProcs,
		Pull:         opts.Pull,
		Debug:        true,
	})
}

type BuildOptions struct {
	Compress     bool
	MaxPullProcs int
	Pull         string
	SaveImage    bool
}
