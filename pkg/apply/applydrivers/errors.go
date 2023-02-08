package applydrivers

import "github.com/labring/sealos/pkg/apply/processor"

func IgnoreCancelledError(err error) error {
	if processor.IsCancelledError(err) {
		return nil
	}
	return err
}
