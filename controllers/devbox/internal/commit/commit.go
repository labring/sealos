package commit

import (
	"context"
	"fmt"
)

type Committer interface {
	Commit(ctx context.Context, devboxName string, commitID string) error
}

type CommitterImpl struct {
	// Client *containerd.Client
}

func (c *CommitterImpl) Commit(ctx context.Context, devboxName string, commitID string) error {
	fmt.Println("commit devbox", devboxName, commitID)
	return nil
}
