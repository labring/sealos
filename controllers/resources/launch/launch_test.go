package launch

import (
	"regexp"
	"testing"
)

func Test_newUUID(t *testing.T) {
	got, err := newUUID()
	if err != nil {
		t.Errorf("newUUID() returned error: %v", err)
		return
	}

	t.Logf("Generated UUID: %v", got)

	// 检查 UUID 的长度
	if len(got) != 36 {
		t.Errorf("newUUID() returned UUID with incorrect length: %v", got)
		return
	}

	// 检查 UUID 的格式
	uuidRegexp := regexp.MustCompile(`^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$`)
	if !uuidRegexp.MatchString(got) {
		t.Errorf("newUUID() returned UUID with incorrect format: %v", got)
	}
}
