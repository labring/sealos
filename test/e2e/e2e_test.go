package e2e

import (
	"github.com/labring/sealos/test/e2e/testhelper/settings"
	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
	"testing"
)

func TestSealosTest(t *testing.T) {
	RegisterFailHandler(Fail)
	RunSpecs(t, "e2e test for sealos")
}

var _ = SynchronizedBeforeSuite(func() []byte {
	//check sealos bin exist
	//exec.CheckCmdIsExist()
	return nil
}, func(data []byte) {
	SetDefaultEventuallyTimeout(settings.DefaultWaiteTime)
})
