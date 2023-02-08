package processor

const CancelledError = "cancelled"

func IsCancelledError(err error) bool {
	return err.Error() == CancelledError
}
