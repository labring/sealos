package e2e

import (
	"testing"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"

	"github.com/labring/sealos/test/e2e/testhelper/settings"
)

func TestSealosTest(t *testing.T) {
	RegisterFailHandler(Fail)
	RunSpecs(t, "e2e test for sealos")
}

var _ = SynchronizedBeforeSuite(func() []byte {
	//check sealos bin exist
	//exec.CheckCmdIsExist()
	SetDefaultEventuallyTimeout(settings.E2EConfig.WaitTime)
	return nil
}, func(data []byte) {
	SetDefaultEventuallyTimeout(settings.E2EConfig.WaitTime)
})
