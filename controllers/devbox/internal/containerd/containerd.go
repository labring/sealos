package containerd

import (
	"context"
)

// var (
// 	containerdClient *containerd.Client
// )

// func init(ctx context.Context) {
// 	containerdClient, err = containerd.New(ctx)
// 	if err != nil {
// 		log.Fatalf("failed to create containerd client: %v", err)
// 	}
// }

func Commit(ctx context.Context, devboxName string, commitID string) error {
	return nil
}
