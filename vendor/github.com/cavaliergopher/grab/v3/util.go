package grab

import (
	"fmt"
	"mime"
	"net/http"
	"os"
	"path"
	"path/filepath"
	"strings"
	"time"
)

// setLastModified sets the last modified timestamp of a local file according to
// the Last-Modified header returned by a remote server.
func setLastModified(resp *http.Response, filename string) error {
	// https://tools.ietf.org/html/rfc7232#section-2.2
	// https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Last-Modified
	header := resp.Header.Get("Last-Modified")
	if header == "" {
		return nil
	}
	lastmod, err := time.Parse(http.TimeFormat, header)
	if err != nil {
		return nil
	}
	return os.Chtimes(filename, lastmod, lastmod)
}

// mkdirp creates all missing parent directories for the destination file path.
func mkdirp(path string) error {
	dir := filepath.Dir(path)
	if fi, err := os.Stat(dir); err != nil {
		if !os.IsNotExist(err) {
			return fmt.Errorf("error checking destination directory: %v", err)
		}
		if err := os.MkdirAll(dir, 0777); err != nil {
			return fmt.Errorf("error creating destination directory: %v", err)
		}
	} else if !fi.IsDir() {
		panic("grab: developer error: destination path is not directory")
	}
	return nil
}

// guessFilename returns a filename for the given http.Response. If none can be
// determined ErrNoFilename is returned.
//
// TODO: NoStore operations should not require a filename
func guessFilename(resp *http.Response) (string, error) {
	filename := resp.Request.URL.Path
	if cd := resp.Header.Get("Content-Disposition"); cd != "" {
		if _, params, err := mime.ParseMediaType(cd); err == nil {
			if val, ok := params["filename"]; ok {
				filename = val
			} // else filename directive is missing.. fallback to URL.Path
		}
	}

	// sanitize
	if filename == "" || strings.HasSuffix(filename, "/") || strings.Contains(filename, "\x00") {
		return "", ErrNoFilename
	}

	filename = filepath.Base(path.Clean("/" + filename))
	if filename == "" || filename == "." || filename == "/" {
		return "", ErrNoFilename
	}

	return filename, nil
}
