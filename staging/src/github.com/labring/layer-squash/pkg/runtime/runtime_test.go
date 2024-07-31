package runtime_test

import (
	"context"
	"fmt"
	"github.com/labring/layer-squash/pkg/options"
	"testing"

	"github.com/containerd/nerdctl/pkg/clientutil"
	"github.com/labring/layer-squash/pkg/runtime"
)

func TestRuntime_Squash(t *testing.T) {
	client, ctx, cancel, err := clientutil.NewClient(context.Background(), "default", "unix:///var/run/containerd/containerd.sock")
	if err != nil {
		fmt.Println(err)
		return
	}
	defer cancel()
	r, err := runtime.NewRuntime(client, "default")
	if err != nil {
		fmt.Println(err)
		return
	}
	opt1 := options.Option{
		SourceImageRef:   "docker.io/lingdie/commit:dev",
		TargetImageName:  "docker.io/lingdie/commit:dev-slim",
		SquashLayerCount: 6,
	}
	if err := r.Squash(ctx, opt1); err != nil {
		fmt.Println(err)
		return
	}
}
