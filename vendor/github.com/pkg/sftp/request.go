package sftp

import (
	"context"
	"io"
	"os"
	"path"
	"path/filepath"
	"strings"
	"sync"
	"syscall"

	"github.com/pkg/errors"
)

// MaxFilelist is the max number of files to return in a readdir batch.
var MaxFilelist int64 = 100

// Request contains the data and state for the incoming service request.
type Request struct {
	// Get, Put, Setstat, Stat, Rename, Remove
	// Rmdir, Mkdir, List, Readlink, Link, Symlink
	Method   string
	Filepath string
	Flags    uint32
	Attrs    []byte // convert to sub-struct
	Target   string // for renames and sym-links
	handle   string
	// reader/writer/readdir from handlers
	state state
	// context lasts duration of request
	ctx       context.Context
	cancelCtx context.CancelFunc
}

type state struct {
	*sync.RWMutex
	writerAt       io.WriterAt
	readerAt       io.ReaderAt
	writerReaderAt WriterAtReaderAt
	listerAt       ListerAt
	lsoffset       int64
}

// New Request initialized based on packet data
func requestFromPacket(ctx context.Context, pkt hasPath) *Request {
	method := requestMethod(pkt)
	request := NewRequest(method, pkt.getPath())
	request.ctx, request.cancelCtx = context.WithCancel(ctx)

	switch p := pkt.(type) {
	case *sshFxpOpenPacket:
		request.Flags = p.Pflags
	case *sshFxpSetstatPacket:
		request.Flags = p.Flags
		request.Attrs = p.Attrs.([]byte)
	case *sshFxpRenamePacket:
		request.Target = cleanPath(p.Newpath)
	case *sshFxpSymlinkPacket:
		// NOTE: given a POSIX compliant signature: symlink(target, linkpath string)
		// this makes Request.Target the linkpath, and Request.Filepath the target.
		request.Target = cleanPath(p.Linkpath)
	case *sshFxpExtendedPacketHardlink:
		request.Target = cleanPath(p.Newpath)
	}
	return request
}

// NewRequest creates a new Request object.
func NewRequest(method, path string) *Request {
	return &Request{Method: method, Filepath: cleanPath(path),
		state: state{RWMutex: new(sync.RWMutex)}}
}

// shallow copy of existing request
func (r *Request) copy() *Request {
	r.state.Lock()
	defer r.state.Unlock()
	r2 := new(Request)
	*r2 = *r
	return r2
}

// Context returns the request's context. To change the context,
// use WithContext.
//
// The returned context is always non-nil; it defaults to the
// background context.
//
// For incoming server requests, the context is canceled when the
// request is complete or the client's connection closes.
func (r *Request) Context() context.Context {
	if r.ctx != nil {
		return r.ctx
	}
	return context.Background()
}

// WithContext returns a copy of r with its context changed to ctx.
// The provided ctx must be non-nil.
func (r *Request) WithContext(ctx context.Context) *Request {
	if ctx == nil {
		panic("nil context")
	}
	r2 := r.copy()
	r2.ctx = ctx
	r2.cancelCtx = nil
	return r2
}

// Returns current offset for file list
func (r *Request) lsNext() int64 {
	r.state.RLock()
	defer r.state.RUnlock()
	return r.state.lsoffset
}

// Increases next offset
func (r *Request) lsInc(offset int64) {
	r.state.Lock()
	defer r.state.Unlock()
	r.state.lsoffset = r.state.lsoffset + offset
}

// manage file read/write state
func (r *Request) setListerState(la ListerAt) {
	r.state.Lock()
	defer r.state.Unlock()
	r.state.listerAt = la
}

func (r *Request) getLister() ListerAt {
	r.state.RLock()
	defer r.state.RUnlock()
	return r.state.listerAt
}

// Close reader/writer if possible
func (r *Request) close() error {
	defer func() {
		if r.cancelCtx != nil {
			r.cancelCtx()
		}
	}()

	r.state.RLock()
	wr := r.state.writerAt
	rd := r.state.readerAt
	rw := r.state.writerReaderAt
	r.state.RUnlock()

	var err error

	// Close errors on a Writer are far more likely to be the important one.
	// As they can be information that there was a loss of data.
	if c, ok := wr.(io.Closer); ok {
		if err2 := c.Close(); err == nil {
			// update error if it is still nil
			err = err2
		}
	}

	if c, ok := rw.(io.Closer); ok {
		if err2 := c.Close(); err == nil {
			// update error if it is still nil
			err = err2
			r.state.writerReaderAt = nil
		}
	}

	if c, ok := rd.(io.Closer); ok {
		if err2 := c.Close(); err == nil {
			// update error if it is still nil
			err = err2
		}
	}

	return err
}

// Notify transfer error if any
func (r *Request) transferError(err error) {
	if err == nil {
		return
	}

	r.state.RLock()
	wr := r.state.writerAt
	rd := r.state.readerAt
	rw := r.state.writerReaderAt
	r.state.RUnlock()

	if t, ok := wr.(TransferError); ok {
		t.TransferError(err)
	}

	if t, ok := rw.(TransferError); ok {
		t.TransferError(err)
	}

	if t, ok := rd.(TransferError); ok {
		t.TransferError(err)
	}
}

// called from worker to handle packet/request
func (r *Request) call(handlers Handlers, pkt requestPacket, alloc *allocator, orderID uint32) responsePacket {
	switch r.Method {
	case "Get":
		return fileget(handlers.FileGet, r, pkt, alloc, orderID)
	case "Put":
		return fileput(handlers.FilePut, r, pkt, alloc, orderID)
	case "Open":
		return fileputget(handlers.FilePut, r, pkt, alloc, orderID)
	case "Setstat", "Rename", "Rmdir", "Mkdir", "Link", "Symlink", "Remove", "PosixRename", "StatVFS":
		return filecmd(handlers.FileCmd, r, pkt)
	case "List":
		return filelist(handlers.FileList, r, pkt)
	case "Stat", "Lstat", "Readlink":
		return filestat(handlers.FileList, r, pkt)
	default:
		return statusFromError(pkt.id(),
			errors.Errorf("unexpected method: %s", r.Method))
	}
}

// Additional initialization for Open packets
func (r *Request) open(h Handlers, pkt requestPacket) responsePacket {
	flags := r.Pflags()

	id := pkt.id()

	switch {
	case flags.Write, flags.Append, flags.Creat, flags.Trunc:
		if flags.Read {
			if openFileWriter, ok := h.FilePut.(OpenFileWriter); ok {
				r.Method = "Open"
				rw, err := openFileWriter.OpenFile(r)
				if err != nil {
					return statusFromError(id, err)
				}
				r.state.writerReaderAt = rw
				return &sshFxpHandlePacket{ID: id, Handle: r.handle}
			}
		}

		r.Method = "Put"
		wr, err := h.FilePut.Filewrite(r)
		if err != nil {
			return statusFromError(id, err)
		}
		r.state.writerAt = wr
	case flags.Read:
		r.Method = "Get"
		rd, err := h.FileGet.Fileread(r)
		if err != nil {
			return statusFromError(id, err)
		}
		r.state.readerAt = rd
	default:
		return statusFromError(id, errors.New("bad file flags"))
	}
	return &sshFxpHandlePacket{ID: id, Handle: r.handle}
}

func (r *Request) opendir(h Handlers, pkt requestPacket) responsePacket {
	r.Method = "List"
	la, err := h.FileList.Filelist(r)
	if err != nil {
		return statusFromError(pkt.id(), wrapPathError(r.Filepath, err))
	}
	r.state.listerAt = la
	return &sshFxpHandlePacket{ID: pkt.id(), Handle: r.handle}
}

// wrap FileReader handler
func fileget(h FileReader, r *Request, pkt requestPacket, alloc *allocator, orderID uint32) responsePacket {
	r.state.RLock()
	reader := r.state.readerAt
	r.state.RUnlock()
	if reader == nil {
		return statusFromError(pkt.id(), errors.New("unexpected read packet"))
	}

	data, offset, _ := packetData(pkt, alloc, orderID)
	n, err := reader.ReadAt(data, offset)
	// only return EOF error if no data left to read
	if err != nil && (err != io.EOF || n == 0) {
		return statusFromError(pkt.id(), err)
	}
	return &sshFxpDataPacket{
		ID:     pkt.id(),
		Length: uint32(n),
		Data:   data[:n],
	}
}

// wrap FileWriter handler
func fileput(h FileWriter, r *Request, pkt requestPacket, alloc *allocator, orderID uint32) responsePacket {
	r.state.RLock()
	writer := r.state.writerAt
	r.state.RUnlock()
	if writer == nil {
		return statusFromError(pkt.id(), errors.New("unexpected write packet"))
	}

	data, offset, _ := packetData(pkt, alloc, orderID)
	_, err := writer.WriteAt(data, offset)
	return statusFromError(pkt.id(), err)
}

// wrap OpenFileWriter handler
func fileputget(h FileWriter, r *Request, pkt requestPacket, alloc *allocator, orderID uint32) responsePacket {
	r.state.RLock()
	writerReader := r.state.writerReaderAt
	r.state.RUnlock()
	if writerReader == nil {
		return statusFromError(pkt.id(), errors.New("unexpected write and read packet"))
	}
	switch p := pkt.(type) {
	case *sshFxpReadPacket:
		data, offset := p.getDataSlice(alloc, orderID), int64(p.Offset)
		n, err := writerReader.ReadAt(data, offset)
		// only return EOF error if no data left to read
		if err != nil && (err != io.EOF || n == 0) {
			return statusFromError(pkt.id(), err)
		}
		return &sshFxpDataPacket{
			ID:     pkt.id(),
			Length: uint32(n),
			Data:   data[:n],
		}
	case *sshFxpWritePacket:
		data, offset := p.Data, int64(p.Offset)
		_, err := writerReader.WriteAt(data, offset)
		return statusFromError(pkt.id(), err)
	default:
		return statusFromError(pkt.id(), errors.New("unexpected packet type for read or write"))
	}
}

// file data for additional read/write packets
func packetData(p requestPacket, alloc *allocator, orderID uint32) (data []byte, offset int64, length uint32) {
	switch p := p.(type) {
	case *sshFxpReadPacket:
		return p.getDataSlice(alloc, orderID), int64(p.Offset), p.Len
	case *sshFxpWritePacket:
		return p.Data, int64(p.Offset), p.Length
	}
	return
}

// wrap FileCmder handler
func filecmd(h FileCmder, r *Request, pkt requestPacket) responsePacket {
	switch p := pkt.(type) {
	case *sshFxpFsetstatPacket:
		r.Flags = p.Flags
		r.Attrs = p.Attrs.([]byte)
	}

	if r.Method == "PosixRename" {
		if posixRenamer, ok := h.(PosixRenameFileCmder); ok {
			err := posixRenamer.PosixRename(r)
			return statusFromError(pkt.id(), err)
		}

		// PosixRenameFileCmder not implemented handle this request as a Rename
		r.Method = "Rename"
		err := h.Filecmd(r)
		return statusFromError(pkt.id(), err)
	}

	if r.Method == "StatVFS" {
		if statVFSCmdr, ok := h.(StatVFSFileCmder); ok {
			stat, err := statVFSCmdr.StatVFS(r)
			if err != nil {
				return statusFromError(pkt.id(), err)
			}
			stat.ID = pkt.id()
			return stat
		}

		return statusFromError(pkt.id(), ErrSSHFxOpUnsupported)
	}

	err := h.Filecmd(r)
	return statusFromError(pkt.id(), err)
}

// wrap FileLister handler
func filelist(h FileLister, r *Request, pkt requestPacket) responsePacket {
	var err error
	lister := r.getLister()
	if lister == nil {
		return statusFromError(pkt.id(), errors.New("unexpected dir packet"))
	}

	offset := r.lsNext()
	finfo := make([]os.FileInfo, MaxFilelist)
	n, err := lister.ListAt(finfo, offset)
	r.lsInc(int64(n))
	// ignore EOF as we only return it when there are no results
	finfo = finfo[:n] // avoid need for nil tests below

	switch r.Method {
	case "List":
		if err != nil && err != io.EOF {
			return statusFromError(pkt.id(), err)
		}
		if err == io.EOF && n == 0 {
			return statusFromError(pkt.id(), io.EOF)
		}
		dirname := filepath.ToSlash(path.Base(r.Filepath))
		ret := &sshFxpNamePacket{ID: pkt.id()}

		for _, fi := range finfo {
			ret.NameAttrs = append(ret.NameAttrs, &sshFxpNameAttr{
				Name:     fi.Name(),
				LongName: runLs(dirname, fi),
				Attrs:    []interface{}{fi},
			})
		}
		return ret
	default:
		err = errors.Errorf("unexpected method: %s", r.Method)
		return statusFromError(pkt.id(), err)
	}
}

func filestat(h FileLister, r *Request, pkt requestPacket) responsePacket {
	var lister ListerAt
	var err error

	if r.Method == "Lstat" {
		if lstatFileLister, ok := h.(LstatFileLister); ok {
			lister, err = lstatFileLister.Lstat(r)
		} else {
			// LstatFileLister not implemented handle this request as a Stat
			r.Method = "Stat"
			lister, err = h.Filelist(r)
		}
	} else {
		lister, err = h.Filelist(r)
	}
	if err != nil {
		return statusFromError(pkt.id(), err)
	}
	finfo := make([]os.FileInfo, 1)
	n, err := lister.ListAt(finfo, 0)
	finfo = finfo[:n] // avoid need for nil tests below

	switch r.Method {
	case "Stat", "Lstat":
		if err != nil && err != io.EOF {
			return statusFromError(pkt.id(), err)
		}
		if n == 0 {
			err = &os.PathError{Op: strings.ToLower(r.Method), Path: r.Filepath,
				Err: syscall.ENOENT}
			return statusFromError(pkt.id(), err)
		}
		return &sshFxpStatResponse{
			ID:   pkt.id(),
			info: finfo[0],
		}
	case "Readlink":
		if err != nil && err != io.EOF {
			return statusFromError(pkt.id(), err)
		}
		if n == 0 {
			err = &os.PathError{Op: "readlink", Path: r.Filepath,
				Err: syscall.ENOENT}
			return statusFromError(pkt.id(), err)
		}
		filename := finfo[0].Name()
		return &sshFxpNamePacket{
			ID: pkt.id(),
			NameAttrs: []*sshFxpNameAttr{
				{
					Name:     filename,
					LongName: filename,
					Attrs:    emptyFileStat,
				},
			},
		}
	default:
		err = errors.Errorf("unexpected method: %s", r.Method)
		return statusFromError(pkt.id(), err)
	}
}

// init attributes of request object from packet data
func requestMethod(p requestPacket) (method string) {
	switch p.(type) {
	case *sshFxpReadPacket, *sshFxpWritePacket, *sshFxpOpenPacket:
		// set in open() above
	case *sshFxpOpendirPacket, *sshFxpReaddirPacket:
		// set in opendir() above
	case *sshFxpSetstatPacket, *sshFxpFsetstatPacket:
		method = "Setstat"
	case *sshFxpRenamePacket:
		method = "Rename"
	case *sshFxpSymlinkPacket:
		method = "Symlink"
	case *sshFxpRemovePacket:
		method = "Remove"
	case *sshFxpStatPacket, *sshFxpFstatPacket:
		method = "Stat"
	case *sshFxpLstatPacket:
		method = "Lstat"
	case *sshFxpRmdirPacket:
		method = "Rmdir"
	case *sshFxpReadlinkPacket:
		method = "Readlink"
	case *sshFxpMkdirPacket:
		method = "Mkdir"
	case *sshFxpExtendedPacketHardlink:
		method = "Link"
	}
	return method
}
