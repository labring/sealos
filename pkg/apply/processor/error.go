package processor

type CheckError struct {
	err error
}

func (e *CheckError) Error() string {
	return e.err.Error()
}

func NewCheckError(err error) error {
	if err != nil {
		err = &CheckError{err: err}
	}
	return err
}

type PreProcessError struct {
	err error
}

func (e *PreProcessError) Error() string {
	return e.err.Error()
}

func NewPreProcessError(err error) error {
	if err != nil {
		err = &PreProcessError{err: err}
	}
	return err
}
