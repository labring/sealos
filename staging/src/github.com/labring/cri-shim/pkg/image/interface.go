package image

import (
	"context"
	"io"

	"github.com/containerd/containerd"
	"github.com/containerd/nerdctl/v2/pkg/api/types"
	"github.com/containerd/nerdctl/v2/pkg/clientutil"
	"github.com/containerd/nerdctl/v2/pkg/cmd/container"
	"github.com/containerd/nerdctl/v2/pkg/cmd/image"
	"github.com/containerd/nerdctl/v2/pkg/cmd/login"
)

// ImageInterface defines the interface for image operations
type ImageInterface interface {
	Push(ctx context.Context, args string) error
	Commit(ctx context.Context, imageName, containerID string, pause bool) error
	Login(ctx context.Context, serverAddress, username, password string) error
	Stop()
}

type imageInterfaceImpl struct {
	GlobalOptions types.GlobalCommandOptions
	Stdout        io.Writer
	Client        *containerd.Client
	Cancel        context.CancelFunc
}

// NewImageInterface returns a new implementation of ImageInterface
// address: the address of the container runtime
// writer: the io.Writer for output
func NewImageInterface(namespace, address string, writer io.Writer) (ImageInterface, error) {
	global := types.GlobalCommandOptions{
		Namespace:        namespace,
		Address:          address,
		InsecureRegistry: true,
	}
	impl := &imageInterfaceImpl{
		GlobalOptions: global,
		Stdout:        writer,
	}
	var err error
	impl.Client, _, impl.Cancel, err = clientutil.NewClient(context.Background(), global.Namespace, global.Address)
	if err != nil {
		return nil, err
	}
	return impl, err
}

func (impl *imageInterfaceImpl) Stop() {
	impl.Client.Close()
}

// Commit commits a container as an image
// imageName: the name of the image
// containerID: the ID of the container
// pause: whether to pause the container before committing
func (impl *imageInterfaceImpl) Commit(ctx context.Context, imageName, containerID string, pause bool) error {
	options := types.ContainerCommitOptions{
		Stdout:   impl.Stdout,
		GOptions: impl.GlobalOptions,
		Pause:    pause,
	}

	tmpName := imageName + "tmp"

	if err := container.Commit(ctx, impl.Client, tmpName, containerID, options); err != nil {
		return err
	}

	if err := impl.convert(ctx, tmpName, imageName); err != nil {
		return err
	}

	return impl.remove(ctx, tmpName, true, false)
}

// convert converts an image to the specified format
// srcRawRef: the source image reference
// destRawRef: the destination image reference
func (impl *imageInterfaceImpl) convert(ctx context.Context, srcRawRef, destRawRef string) error {
	options := types.ImageConvertOptions{
		GOptions: impl.GlobalOptions,
		Oci:      true,
		Stdout:   impl.Stdout,
	}
	return image.Convert(ctx, impl.Client, srcRawRef, destRawRef, options)
}

// remove deletes the specified image
// args: the list of images
// force: whether to force delete
// async: whether to delete asynchronously
func (impl *imageInterfaceImpl) remove(ctx context.Context, args string, force, async bool) error {
	options := types.ImageRemoveOptions{
		Stdout:   impl.Stdout,
		GOptions: impl.GlobalOptions,
		Force:    force,
		Async:    async,
	}
	return image.Remove(ctx, impl.Client, []string{args}, options)
}

// Push pushes an image to a remote repository
// args: the list of images
func (impl *imageInterfaceImpl) Push(ctx context.Context, args string) error {
	options := types.ImagePushOptions{
		GOptions: impl.GlobalOptions,
		Stdout:   impl.Stdout,
	}

	return image.Push(ctx, impl.Client, args, options)
}

// Login logs in to the image registry
// serverAddress: the registry address
// username: the username
// password: the password
func (impl *imageInterfaceImpl) Login(ctx context.Context, serverAddress, username, password string) error {
	options := types.LoginCommandOptions{
		GOptions: impl.GlobalOptions,
		Username: username,
		Password: password,
	}
	if serverAddress != "" {
		options.ServerAddress = serverAddress
	}

	return login.Login(ctx, options, impl.Stdout)
}
