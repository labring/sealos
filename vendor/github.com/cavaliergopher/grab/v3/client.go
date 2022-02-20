package grab

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"sync"
	"sync/atomic"
	"time"
)

// HTTPClient provides an interface allowing us to perform HTTP requests.
type HTTPClient interface {
	Do(req *http.Request) (*http.Response, error)
}

// truncater is a private interface allowing different response
// Writers to be truncated
type truncater interface {
	Truncate(size int64) error
}

// A Client is a file download client.
//
// Clients are safe for concurrent use by multiple goroutines.
type Client struct {
	// HTTPClient specifies the http.Client which will be used for communicating
	// with the remote server during the file transfer.
	HTTPClient HTTPClient

	// UserAgent specifies the User-Agent string which will be set in the
	// headers of all requests made by this client.
	//
	// The user agent string may be overridden in the headers of each request.
	UserAgent string

	// BufferSize specifies the size in bytes of the buffer that is used for
	// transferring all requested files. Larger buffers may result in faster
	// throughput but will use more memory and result in less frequent updates
	// to the transfer progress statistics. The BufferSize of each request can
	// be overridden on each Request object. Default: 32KB.
	BufferSize int
}

// NewClient returns a new file download Client, using default configuration.
func NewClient() *Client {
	return &Client{
		UserAgent: "grab",
		HTTPClient: &http.Client{
			Transport: &http.Transport{
				Proxy: http.ProxyFromEnvironment,
			},
		},
	}
}

// DefaultClient is the default client and is used by all Get convenience
// functions.
var DefaultClient = NewClient()

// Do sends a file transfer request and returns a file transfer response,
// following policy (e.g. redirects, cookies, auth) as configured on the
// client's HTTPClient.
//
// Like http.Get, Do blocks while the transfer is initiated, but returns as soon
// as the transfer has started transferring in a background goroutine, or if it
// failed early.
//
// An error is returned via Response.Err if caused by client policy (such as
// CheckRedirect), or if there was an HTTP protocol or IO error. Response.Err
// will block the caller until the transfer is completed, successfully or
// otherwise.
func (c *Client) Do(req *Request) *Response {
	// cancel will be called on all code-paths via closeResponse
	ctx, cancel := context.WithCancel(req.Context())
	req = req.WithContext(ctx)
	resp := &Response{
		Request:    req,
		Start:      time.Now(),
		Done:       make(chan struct{}, 0),
		Filename:   req.Filename,
		ctx:        ctx,
		cancel:     cancel,
		bufferSize: req.BufferSize,
	}
	if resp.bufferSize == 0 {
		// default to Client.BufferSize
		resp.bufferSize = c.BufferSize
	}

	// Run state-machine while caller is blocked to initialize the file transfer.
	// Must never transition to the copyFile state - this happens next in another
	// goroutine.
	c.run(resp, c.statFileInfo)

	// Run copyFile in a new goroutine. copyFile will no-op if the transfer is
	// already complete or failed.
	go c.run(resp, c.copyFile)
	return resp
}

// DoChannel executes all requests sent through the given Request channel, one
// at a time, until it is closed by another goroutine. The caller is blocked
// until the Request channel is closed and all transfers have completed. All
// responses are sent through the given Response channel as soon as they are
// received from the remote servers and can be used to track the progress of
// each download.
//
// Slow Response receivers will cause a worker to block and therefore delay the
// start of the transfer for an already initiated connection - potentially
// causing a server timeout. It is the caller's responsibility to ensure a
// sufficient buffer size is used for the Response channel to prevent this.
//
// If an error occurs during any of the file transfers it will be accessible via
// the associated Response.Err function.
func (c *Client) DoChannel(reqch <-chan *Request, respch chan<- *Response) {
	// TODO: enable cancelling of batch jobs
	for req := range reqch {
		resp := c.Do(req)
		respch <- resp
		<-resp.Done
	}
}

// DoBatch executes all the given requests using the given number of concurrent
// workers. Control is passed back to the caller as soon as the workers are
// initiated.
//
// If the requested number of workers is less than one, a worker will be created
// for every request. I.e. all requests will be executed concurrently.
//
// If an error occurs during any of the file transfers it will be accessible via
// call to the associated Response.Err.
//
// The returned Response channel is closed only after all of the given Requests
// have completed, successfully or otherwise.
func (c *Client) DoBatch(workers int, requests ...*Request) <-chan *Response {
	if workers < 1 {
		workers = len(requests)
	}
	reqch := make(chan *Request, len(requests))
	respch := make(chan *Response, len(requests))
	wg := sync.WaitGroup{}
	for i := 0; i < workers; i++ {
		wg.Add(1)
		go func() {
			c.DoChannel(reqch, respch)
			wg.Done()
		}()
	}

	// queue requests
	go func() {
		for _, req := range requests {
			reqch <- req
		}
		close(reqch)
		wg.Wait()
		close(respch)
	}()
	return respch
}

// An stateFunc is an action that mutates the state of a Response and returns
// the next stateFunc to be called.
type stateFunc func(*Response) stateFunc

// run calls the given stateFunc function and all subsequent returned stateFuncs
// until a stateFunc returns nil or the Response.ctx is canceled. Each stateFunc
// should mutate the state of the given Response until it has completed
// downloading or failed.
func (c *Client) run(resp *Response, f stateFunc) {
	for {
		select {
		case <-resp.ctx.Done():
			if resp.IsComplete() {
				return
			}
			resp.err = resp.ctx.Err()
			f = c.closeResponse

		default:
			// keep working
		}
		if f = f(resp); f == nil {
			return
		}
	}
}

// statFileInfo retrieves FileInfo for any local file matching
// Response.Filename.
//
// If the file does not exist, is a directory, or its name is unknown the next
// stateFunc is headRequest.
//
// If the file exists, Response.fi is set and the next stateFunc is
// validateLocal.
//
// If an error occurs, the next stateFunc is closeResponse.
func (c *Client) statFileInfo(resp *Response) stateFunc {
	if resp.Request.NoStore || resp.Filename == "" {
		return c.headRequest
	}
	fi, err := os.Stat(resp.Filename)
	if err != nil {
		if os.IsNotExist(err) {
			return c.headRequest
		}
		resp.err = err
		return c.closeResponse
	}
	if fi.IsDir() {
		resp.Filename = ""
		return c.headRequest
	}
	resp.fi = fi
	return c.validateLocal
}

// validateLocal compares a local copy of the downloaded file to the remote
// file.
//
// An error is returned if the local file is larger than the remote file, or
// Request.SkipExisting is true.
//
// If the existing file matches the length of the remote file, the next
// stateFunc is checksumFile.
//
// If the local file is smaller than the remote file and the remote server is
// known to support ranged requests, the next stateFunc is getRequest.
func (c *Client) validateLocal(resp *Response) stateFunc {
	if resp.Request.SkipExisting {
		resp.err = ErrFileExists
		return c.closeResponse
	}

	// determine target file size
	expectedSize := resp.Request.Size
	if expectedSize == 0 && resp.HTTPResponse != nil {
		expectedSize = resp.HTTPResponse.ContentLength
	}

	if expectedSize == 0 {
		// size is either actually 0 or unknown
		// if unknown, we ask the remote server
		// if known to be 0, we proceed with a GET
		return c.headRequest
	}

	if expectedSize == resp.fi.Size() {
		// local file matches remote file size - wrap it up
		resp.DidResume = true
		resp.bytesResumed = resp.fi.Size()
		return c.checksumFile
	}

	if resp.Request.NoResume {
		// local file should be overwritten
		return c.getRequest
	}

	if expectedSize >= 0 && expectedSize < resp.fi.Size() {
		// remote size is known, is smaller than local size and we want to resume
		resp.err = ErrBadLength
		return c.closeResponse
	}

	if resp.CanResume {
		// set resume range on GET request
		resp.Request.HTTPRequest.Header.Set(
			"Range",
			fmt.Sprintf("bytes=%d-", resp.fi.Size()))
		resp.DidResume = true
		resp.bytesResumed = resp.fi.Size()
		return c.getRequest
	}
	return c.headRequest
}

func (c *Client) checksumFile(resp *Response) stateFunc {
	if resp.Request.hash == nil {
		return c.closeResponse
	}
	if resp.Filename == "" {
		panic("grab: developer error: filename not set")
	}
	if resp.Size() < 0 {
		panic("grab: developer error: size unknown")
	}
	req := resp.Request

	// compute checksum
	var sum []byte
	sum, resp.err = resp.checksumUnsafe()
	if resp.err != nil {
		return c.closeResponse
	}

	// compare checksum
	if !bytes.Equal(sum, req.checksum) {
		resp.err = ErrBadChecksum
		if !resp.Request.NoStore && req.deleteOnError {
			if err := os.Remove(resp.Filename); err != nil {
				// err should be os.PathError and include file path
				resp.err = fmt.Errorf(
					"cannot remove downloaded file with checksum mismatch: %v",
					err)
			}
		}
	}
	return c.closeResponse
}

// doHTTPRequest sends a HTTP Request and returns the response
func (c *Client) doHTTPRequest(req *http.Request) (*http.Response, error) {
	if c.UserAgent != "" && req.Header.Get("User-Agent") == "" {
		req.Header.Set("User-Agent", c.UserAgent)
	}
	return c.HTTPClient.Do(req)
}

func (c *Client) headRequest(resp *Response) stateFunc {
	if resp.optionsKnown {
		return c.getRequest
	}
	resp.optionsKnown = true

	if resp.Request.NoResume {
		return c.getRequest
	}

	if resp.Filename != "" && resp.fi == nil {
		// destination path is already known and does not exist
		return c.getRequest
	}

	hreq := new(http.Request)
	*hreq = *resp.Request.HTTPRequest
	hreq.Method = "HEAD"

	resp.HTTPResponse, resp.err = c.doHTTPRequest(hreq)
	if resp.err != nil {
		return c.closeResponse
	}
	resp.HTTPResponse.Body.Close()

	if resp.HTTPResponse.StatusCode != http.StatusOK {
		return c.getRequest
	}

	// In case of redirects during HEAD, record the final URL and use it
	// instead of the original URL when sending future requests.
	// This way we avoid sending potentially unsupported requests to
	// the original URL, e.g. "Range", since it was the final URL
	// that advertised its support.
	resp.Request.HTTPRequest.URL = resp.HTTPResponse.Request.URL
	resp.Request.HTTPRequest.Host = resp.HTTPResponse.Request.Host

	return c.readResponse
}

func (c *Client) getRequest(resp *Response) stateFunc {
	resp.HTTPResponse, resp.err = c.doHTTPRequest(resp.Request.HTTPRequest)
	if resp.err != nil {
		return c.closeResponse
	}

	// TODO: check Content-Range

	// check status code
	if !resp.Request.IgnoreBadStatusCodes {
		if resp.HTTPResponse.StatusCode < 200 || resp.HTTPResponse.StatusCode > 299 {
			resp.err = StatusCodeError(resp.HTTPResponse.StatusCode)
			return c.closeResponse
		}
	}

	return c.readResponse
}

func (c *Client) readResponse(resp *Response) stateFunc {
	if resp.HTTPResponse == nil {
		panic("grab: developer error: Response.HTTPResponse is nil")
	}

	// check expected size
	resp.sizeUnsafe = resp.HTTPResponse.ContentLength
	if resp.sizeUnsafe >= 0 {
		// remote size is known
		resp.sizeUnsafe += resp.bytesResumed
		if resp.Request.Size > 0 && resp.Request.Size != resp.sizeUnsafe {
			resp.err = ErrBadLength
			return c.closeResponse
		}
	}

	// check filename
	if resp.Filename == "" {
		filename, err := guessFilename(resp.HTTPResponse)
		if err != nil {
			resp.err = err
			return c.closeResponse
		}
		// Request.Filename will be empty or a directory
		resp.Filename = filepath.Join(resp.Request.Filename, filename)
	}

	if !resp.Request.NoStore && resp.requestMethod() == "HEAD" {
		if resp.HTTPResponse.Header.Get("Accept-Ranges") == "bytes" {
			resp.CanResume = true
		}
		return c.statFileInfo
	}
	return c.openWriter
}

// openWriter opens the destination file for writing and seeks to the location
// from whence the file transfer will resume.
//
// Requires that Response.Filename and resp.DidResume are already be set.
func (c *Client) openWriter(resp *Response) stateFunc {
	if !resp.Request.NoStore && !resp.Request.NoCreateDirectories {
		resp.err = mkdirp(resp.Filename)
		if resp.err != nil {
			return c.closeResponse
		}
	}

	if resp.Request.NoStore {
		resp.writer = &resp.storeBuffer
	} else {
		// compute write flags
		flag := os.O_CREATE | os.O_WRONLY
		if resp.fi != nil {
			if resp.DidResume {
				flag = os.O_APPEND | os.O_WRONLY
			} else {
				// truncate later in copyFile, if not cancelled
				// by BeforeCopy hook
				flag = os.O_WRONLY
			}
		}

		// open file
		f, err := os.OpenFile(resp.Filename, flag, 0666)
		if err != nil {
			resp.err = err
			return c.closeResponse
		}
		resp.writer = f

		// seek to start or end
		whence := os.SEEK_SET
		if resp.bytesResumed > 0 {
			whence = os.SEEK_END
		}
		_, resp.err = f.Seek(0, whence)
		if resp.err != nil {
			return c.closeResponse
		}
	}

	// init transfer
	if resp.bufferSize < 1 {
		resp.bufferSize = 32 * 1024
	}
	b := make([]byte, resp.bufferSize)
	resp.transfer = newTransfer(
		resp.Request.Context(),
		resp.Request.RateLimiter,
		resp.writer,
		resp.HTTPResponse.Body,
		b)

	// next step is copyFile, but this will be called later in another goroutine
	return nil
}

// copy transfers content for a HTTP connection established via Client.do()
func (c *Client) copyFile(resp *Response) stateFunc {
	if resp.IsComplete() {
		return nil
	}

	// run BeforeCopy hook
	if f := resp.Request.BeforeCopy; f != nil {
		resp.err = f(resp)
		if resp.err != nil {
			return c.closeResponse
		}
	}

	var bytesCopied int64
	if resp.transfer == nil {
		panic("grab: developer error: Response.transfer is nil")
	}

	// We waited to truncate the file in openWriter() to make sure
	// the BeforeCopy didn't cancel the copy. If this was an existing
	// file that is not going to be resumed, truncate the contents.
	if t, ok := resp.writer.(truncater); ok && resp.fi != nil && !resp.DidResume {
		t.Truncate(0)
	}

	bytesCopied, resp.err = resp.transfer.copy()
	if resp.err != nil {
		return c.closeResponse
	}
	closeWriter(resp)

	// set file timestamp
	if !resp.Request.NoStore && !resp.Request.IgnoreRemoteTime {
		resp.err = setLastModified(resp.HTTPResponse, resp.Filename)
		if resp.err != nil {
			return c.closeResponse
		}
	}

	// update transfer size if previously unknown
	if resp.Size() < 0 {
		discoveredSize := resp.bytesResumed + bytesCopied
		atomic.StoreInt64(&resp.sizeUnsafe, discoveredSize)
		if resp.Request.Size > 0 && resp.Request.Size != discoveredSize {
			resp.err = ErrBadLength
			return c.closeResponse
		}
	}

	// run AfterCopy hook
	if f := resp.Request.AfterCopy; f != nil {
		resp.err = f(resp)
		if resp.err != nil {
			return c.closeResponse
		}
	}

	return c.checksumFile
}

func closeWriter(resp *Response) {
	if closer, ok := resp.writer.(io.Closer); ok {
		closer.Close()
	}
	resp.writer = nil
}

// close finalizes the Response
func (c *Client) closeResponse(resp *Response) stateFunc {
	if resp.IsComplete() {
		panic("grab: developer error: response already closed")
	}

	resp.fi = nil
	closeWriter(resp)
	resp.closeResponseBody()

	resp.End = time.Now()
	close(resp.Done)
	if resp.cancel != nil {
		resp.cancel()
	}

	return nil
}
