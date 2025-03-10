package notify_test

import (
	"context"
	"os"
	"testing"

	"github.com/labring/sealos/service/aiproxy/common/notify"
)

func TestPostToFeiShuv2(t *testing.T) {
	err := notify.PostToFeiShuv2(
		context.Background(),
		notify.FeishuColorRed,
		"Error",
		"Error Message",
		os.Getenv("FEISHU_WEBHOOK"))
	if err != nil {
		t.Error(err)
	}
}
