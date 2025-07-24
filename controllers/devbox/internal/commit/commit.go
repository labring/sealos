package commit

import (
	"context"
	"io"
	"log"

	"github.com/containerd/containerd/v2/client"
	"github.com/containerd/nerdctl/v2/pkg/api/types"
	"github.com/containerd/nerdctl/v2/pkg/cmd/container"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
	// imageutil "github.com/labring/cri-shim/pkg/image"
)

type Committer interface {
	Commit(ctx context.Context, devboxName string, containerID string, targetImage string) error
}

type CommitterImpl struct {
	Client *client.Client
	// imageClient imageutil.ImageInterface
}

// NewCommitter: New a Committer Impl
func NewCommitter() Committer {
	conn, err := grpc.NewClient(address, grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		log.Println("NewCommitter failed, err: ", err)
		return nil
	}
	containerdClient, err := client.NewWithConn(conn, client.WithDefaultNamespace(namespace))
	if err != nil {
		log.Println("NewCommitter failed, err: ", err)
		return nil
	}
	return &CommitterImpl{
		Client: containerdClient,
	}
}

// Commit: Commit one container to image
func (c *CommitterImpl) Commit(ctx context.Context, devboxName string, containerID string, targetImage string) error {
	log.Println("commit devbox", devboxName, targetImage)
	global := types.GlobalCommandOptions{
		Namespace:        namespace,
		Address:          address,
		DataRoot:         "/var/lib/containerd",
		InsecureRegistry: true,
	}

	// pause before container commit
	opt := types.ContainerCommitOptions{
		Stdout:   io.Discard,
		GOptions: global,
		Pause:    true,
	}
	return container.Commit(ctx, c.Client, targetImage, containerID, opt)
	// return c.imageClient.Commit(ctx, targetImage, containerID, true)
}
