package sftp

import (
	"context"
	"io"
	"path"
	"path/filepath"
	"strconv"
	"sync"

	"github.com/pkg/errors"
)

var maxTxPacket uint32 = 1 << 15

// Handlers contains the 4 SFTP server request handlers.
type Handlers struct {
	FileGet  FileReader
	FilePut  FileWriter
	FileCmd  FileCmder
	FileList FileLister
}

// RequestServer abstracts the sftp protocol with an http request-like protocol
type RequestServer struct {
	*serverConn
	Handlers        Handlers
	pktMgr          *packetManager
	openRequests    map[string]*Request
	openRequestLock sync.RWMutex
	handleCount     int
}

// A RequestServerOption is a function which applies configuration to a RequestServer.
type RequestServerOption func(*RequestServer)

// WithRSAllocator enable the allocator.
// After processing a packet we keep in memory the allocated slices
// and we reuse them for new packets.
// The allocator is experimental
func WithRSAllocator() RequestServerOption {
	return func(rs *RequestServer) {
		alloc := newAllocator()
		rs.pktMgr.alloc = alloc
		rs.conn.alloc = alloc
	}
}

// NewRequestServer creates/allocates/returns new RequestServer.
// Normally there will be one server per user-session.
func NewRequestServer(rwc io.ReadWriteCloser, h Handlers, options ...RequestServerOption) *RequestServer {
	svrConn := &serverConn{
		conn: conn{
			Reader:      rwc,
			WriteCloser: rwc,
		},
	}
	rs := &RequestServer{
		serverConn:   svrConn,
		Handlers:     h,
		pktMgr:       newPktMgr(svrConn),
		openRequests: make(map[string]*Request),
	}

	for _, o := range options {
		o(rs)
	}
	return rs
}

// New Open packet/Request
func (rs *RequestServer) nextRequest(r *Request) string {
	rs.openRequestLock.Lock()
	defer rs.openRequestLock.Unlock()
	rs.handleCount++
	handle := strconv.Itoa(rs.handleCount)
	r.handle = handle
	rs.openRequests[handle] = r
	return handle
}

// Returns Request from openRequests, bool is false if it is missing.
//
// The Requests in openRequests work essentially as open file descriptors that
// you can do different things with. What you are doing with it are denoted by
// the first packet of that type (read/write/etc).
func (rs *RequestServer) getRequest(handle string) (*Request, bool) {
	rs.openRequestLock.RLock()
	defer rs.openRequestLock.RUnlock()
	r, ok := rs.openRequests[handle]
	return r, ok
}

// Close the Request and clear from openRequests map
func (rs *RequestServer) closeRequest(handle string) error {
	rs.openRequestLock.Lock()
	defer rs.openRequestLock.Unlock()
	if r, ok := rs.openRequests[handle]; ok {
		delete(rs.openRequests, handle)
		return r.close()
	}
	return EBADF
}

// Close the read/write/closer to trigger exiting the main server loop
func (rs *RequestServer) Close() error { return rs.conn.Close() }

func (rs *RequestServer) serveLoop(pktChan chan<- orderedRequest) error {
	defer close(pktChan) // shuts down sftpServerWorkers

	var err error
	var pkt requestPacket
	var pktType uint8
	var pktBytes []byte

	for {
		pktType, pktBytes, err = rs.serverConn.recvPacket(rs.pktMgr.getNextOrderID())
		if err != nil {
			// we don't care about releasing allocated pages here, the server will quit and the allocator freed
			return err
		}

		pkt, err = makePacket(rxPacket{fxp(pktType), pktBytes})
		if err != nil {
			switch errors.Cause(err) {
			case errUnknownExtendedPacket:
				// do nothing
			default:
				debug("makePacket err: %v", err)
				rs.conn.Close() // shuts down recvPacket
				return err
			}
		}

		pktChan <- rs.pktMgr.newOrderedRequest(pkt)
	}
}

// Serve requests for user session
func (rs *RequestServer) Serve() error {
	defer func() {
		if rs.pktMgr.alloc != nil {
			rs.pktMgr.alloc.Free()
		}
	}()
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	var wg sync.WaitGroup
	runWorker := func(ch chan orderedRequest) {
		wg.Add(1)
		go func() {
			defer wg.Done()
			if err := rs.packetWorker(ctx, ch); err != nil {
				rs.conn.Close() // shuts down recvPacket
			}
		}()
	}
	pktChan := rs.pktMgr.workerChan(runWorker)

	err := rs.serveLoop(pktChan)

	wg.Wait() // wait for all workers to exit

	rs.openRequestLock.Lock()
	defer rs.openRequestLock.Unlock()

	// make sure all open requests are properly closed
	// (eg. possible on dropped connections, client crashes, etc.)
	for handle, req := range rs.openRequests {
		if err == io.EOF {
			err = io.ErrUnexpectedEOF
		}
		req.transferError(err)

		delete(rs.openRequests, handle)
		req.close()
	}

	return err
}

func (rs *RequestServer) packetWorker(
	ctx context.Context, pktChan chan orderedRequest,
) error {
	for pkt := range pktChan {
		orderID := pkt.orderID()
		if epkt, ok := pkt.requestPacket.(*sshFxpExtendedPacket); ok {
			if epkt.SpecificPacket != nil {
				pkt.requestPacket = epkt.SpecificPacket
			}
		}

		var rpkt responsePacket
		switch pkt := pkt.requestPacket.(type) {
		case *sshFxInitPacket:
			rpkt = &sshFxVersionPacket{Version: sftpProtocolVersion, Extensions: sftpExtensions}
		case *sshFxpClosePacket:
			handle := pkt.getHandle()
			rpkt = statusFromError(pkt.ID, rs.closeRequest(handle))
		case *sshFxpRealpathPacket:
			rpkt = cleanPacketPath(pkt)
		case *sshFxpOpendirPacket:
			request := requestFromPacket(ctx, pkt)
			handle := rs.nextRequest(request)
			rpkt = request.opendir(rs.Handlers, pkt)
			if _, ok := rpkt.(*sshFxpHandlePacket); !ok {
				// if we return an error we have to remove the handle from the active ones
				rs.closeRequest(handle)
			}
		case *sshFxpOpenPacket:
			request := requestFromPacket(ctx, pkt)
			handle := rs.nextRequest(request)
			rpkt = request.open(rs.Handlers, pkt)
			if _, ok := rpkt.(*sshFxpHandlePacket); !ok {
				// if we return an error we have to remove the handle from the active ones
				rs.closeRequest(handle)
			}
		case *sshFxpFstatPacket:
			handle := pkt.getHandle()
			request, ok := rs.getRequest(handle)
			if !ok {
				rpkt = statusFromError(pkt.ID, EBADF)
			} else {
				request = NewRequest("Stat", request.Filepath)
				rpkt = request.call(rs.Handlers, pkt, rs.pktMgr.alloc, orderID)
			}
		case *sshFxpFsetstatPacket:
			handle := pkt.getHandle()
			request, ok := rs.getRequest(handle)
			if !ok {
				rpkt = statusFromError(pkt.ID, EBADF)
			} else {
				request = NewRequest("Setstat", request.Filepath)
				rpkt = request.call(rs.Handlers, pkt, rs.pktMgr.alloc, orderID)
			}
		case *sshFxpExtendedPacketPosixRename:
			request := NewRequest("PosixRename", pkt.Oldpath)
			request.Target = pkt.Newpath
			rpkt = request.call(rs.Handlers, pkt, rs.pktMgr.alloc, orderID)
		case *sshFxpExtendedPacketStatVFS:
			request := NewRequest("StatVFS", pkt.Path)
			rpkt = request.call(rs.Handlers, pkt, rs.pktMgr.alloc, orderID)
		case hasHandle:
			handle := pkt.getHandle()
			request, ok := rs.getRequest(handle)
			if !ok {
				rpkt = statusFromError(pkt.id(), EBADF)
			} else {
				rpkt = request.call(rs.Handlers, pkt, rs.pktMgr.alloc, orderID)
			}
		case hasPath:
			request := requestFromPacket(ctx, pkt)
			rpkt = request.call(rs.Handlers, pkt, rs.pktMgr.alloc, orderID)
			request.close()
		default:
			rpkt = statusFromError(pkt.id(), ErrSSHFxOpUnsupported)
		}

		rs.pktMgr.readyPacket(
			rs.pktMgr.newOrderedResponse(rpkt, orderID))
	}
	return nil
}

// clean and return name packet for file
func cleanPacketPath(pkt *sshFxpRealpathPacket) responsePacket {
	path := cleanPath(pkt.getPath())
	return &sshFxpNamePacket{
		ID: pkt.id(),
		NameAttrs: []*sshFxpNameAttr{
			{
				Name:     path,
				LongName: path,
				Attrs:    emptyFileStat,
			},
		},
	}
}

// Makes sure we have a clean POSIX (/) absolute path to work with
func cleanPath(p string) string {
	p = filepath.ToSlash(p)
	if !path.IsAbs(p) {
		p = "/" + p
	}
	return path.Clean(p)
}
