package trylock_test

import (
	"testing"
	"time"

	"github.com/labring/sealos/service/aiproxy/common/trylock"
)

func TestMemLock(t *testing.T) {
	if !trylock.MemLock("", time.Second) {
		t.Error("Expected true, Got false")
	}
	if trylock.MemLock("", time.Second) {
		t.Error("Expected false, Got true")
	}
	if trylock.MemLock("", time.Second) {
		t.Error("Expected false, Got true")
	}
	time.Sleep(time.Second)
	if !trylock.MemLock("", time.Second) {
		t.Error("Expected true, Got false")
	}
}
