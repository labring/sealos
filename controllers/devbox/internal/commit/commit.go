package commit

import (
	"context"
	"fmt"
)

type Committer interface {
	Commit(ctx context.Context, devboxName string, contentID string, baseImage string, commitImage string) error
}

type CommitterImpl struct {
	// Client *containerd.Client
}

func (c *CommitterImpl) Commit(ctx context.Context, devboxName string, contentID string, baseImage string, commitImage string) error {
	fmt.Println("========>>>> commit devbox", devboxName, contentID, baseImage, commitImage)
	return nil
}

type GcHandler interface {
	GC(ctx context.Context) error
}

type Handler struct {
}
