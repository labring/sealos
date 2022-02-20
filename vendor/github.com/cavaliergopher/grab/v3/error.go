package grab

import (
	"errors"
	"fmt"
	"net/http"
)

var (
	// ErrBadLength indicates that the server response or an existing file does
	// not match the expected content length.
	ErrBadLength = errors.New("bad content length")

	// ErrBadChecksum indicates that a downloaded file failed to pass checksum
	// validation.
	ErrBadChecksum = errors.New("checksum mismatch")

	// ErrNoFilename indicates that a reasonable filename could not be
	// automatically determined using the URL or response headers from a server.
	ErrNoFilename = errors.New("no filename could be determined")

	// ErrNoTimestamp indicates that a timestamp could not be automatically
	// determined using the response headers from the remote server.
	ErrNoTimestamp = errors.New("no timestamp could be determined for the remote file")

	// ErrFileExists indicates that the destination path already exists.
	ErrFileExists = errors.New("file exists")
)

// StatusCodeError indicates that the server response had a status code that
// was not in the 200-299 range (after following any redirects).
type StatusCodeError int

func (err StatusCodeError) Error() string {
	return fmt.Sprintf("server returned %d %s", err, http.StatusText(int(err)))
}

// IsStatusCodeError returns true if the given error is of type StatusCodeError.
func IsStatusCodeError(err error) bool {
	_, ok := err.(StatusCodeError)
	return ok
}
