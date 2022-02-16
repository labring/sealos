package sftp

import (
	"bytes"
	"encoding"
	"encoding/binary"
	"fmt"
	"io"
	"os"
	"reflect"

	"github.com/pkg/errors"
)

var (
	errLongPacket            = errors.New("packet too long")
	errShortPacket           = errors.New("packet too short")
	errUnknownExtendedPacket = errors.New("unknown extended packet")
)

const (
	maxMsgLength           = 256 * 1024
	debugDumpTxPacket      = false
	debugDumpRxPacket      = false
	debugDumpTxPacketBytes = false
	debugDumpRxPacketBytes = false
)

func marshalUint32(b []byte, v uint32) []byte {
	return append(b, byte(v>>24), byte(v>>16), byte(v>>8), byte(v))
}

func marshalUint64(b []byte, v uint64) []byte {
	return marshalUint32(marshalUint32(b, uint32(v>>32)), uint32(v))
}

func marshalString(b []byte, v string) []byte {
	return append(marshalUint32(b, uint32(len(v))), v...)
}

func marshal(b []byte, v interface{}) []byte {
	if v == nil {
		return b
	}
	switch v := v.(type) {
	case uint8:
		return append(b, v)
	case uint32:
		return marshalUint32(b, v)
	case uint64:
		return marshalUint64(b, v)
	case string:
		return marshalString(b, v)
	case os.FileInfo:
		return marshalFileInfo(b, v)
	default:
		switch d := reflect.ValueOf(v); d.Kind() {
		case reflect.Struct:
			for i, n := 0, d.NumField(); i < n; i++ {
				b = marshal(b, d.Field(i).Interface())
			}
			return b
		case reflect.Slice:
			for i, n := 0, d.Len(); i < n; i++ {
				b = marshal(b, d.Index(i).Interface())
			}
			return b
		default:
			panic(fmt.Sprintf("marshal(%#v): cannot handle type %T", v, v))
		}
	}
}

func unmarshalUint32(b []byte) (uint32, []byte) {
	v := uint32(b[3]) | uint32(b[2])<<8 | uint32(b[1])<<16 | uint32(b[0])<<24
	return v, b[4:]
}

func unmarshalUint32Safe(b []byte) (uint32, []byte, error) {
	var v uint32
	if len(b) < 4 {
		return 0, nil, errShortPacket
	}
	v, b = unmarshalUint32(b)
	return v, b, nil
}

func unmarshalUint64(b []byte) (uint64, []byte) {
	h, b := unmarshalUint32(b)
	l, b := unmarshalUint32(b)
	return uint64(h)<<32 | uint64(l), b
}

func unmarshalUint64Safe(b []byte) (uint64, []byte, error) {
	var v uint64
	if len(b) < 8 {
		return 0, nil, errShortPacket
	}
	v, b = unmarshalUint64(b)
	return v, b, nil
}

func unmarshalString(b []byte) (string, []byte) {
	n, b := unmarshalUint32(b)
	return string(b[:n]), b[n:]
}

func unmarshalStringSafe(b []byte) (string, []byte, error) {
	n, b, err := unmarshalUint32Safe(b)
	if err != nil {
		return "", nil, err
	}
	if int64(n) > int64(len(b)) {
		return "", nil, errShortPacket
	}
	return string(b[:n]), b[n:], nil
}

type packetMarshaler interface {
	marshalPacket() (header, payload []byte, err error)
}

func marshalPacket(m encoding.BinaryMarshaler) (header, payload []byte, err error) {
	if m, ok := m.(packetMarshaler); ok {
		return m.marshalPacket()
	}

	header, err = m.MarshalBinary()
	return
}

// sendPacket marshals p according to RFC 4234.
func sendPacket(w io.Writer, m encoding.BinaryMarshaler) error {
	header, payload, err := marshalPacket(m)
	if err != nil {
		return errors.Errorf("binary marshaller failed: %v", err)
	}

	length := len(header) + len(payload) - 4 // subtract the uint32(length) from the start
	if debugDumpTxPacketBytes {
		debug("send packet: %s %d bytes %x%x", fxp(header[4]), length, header[5:], payload)
	} else if debugDumpTxPacket {
		debug("send packet: %s %d bytes", fxp(header[4]), length)
	}

	binary.BigEndian.PutUint32(header[:4], uint32(length))

	if _, err := w.Write(header); err != nil {
		return errors.Errorf("failed to send packet: %v", err)
	}

	if len(payload) > 0 {
		if _, err := w.Write(payload); err != nil {
			return errors.Errorf("failed to send packet payload: %v", err)
		}
	}

	return nil
}

func recvPacket(r io.Reader, alloc *allocator, orderID uint32) (uint8, []byte, error) {
	var b []byte
	if alloc != nil {
		b = alloc.GetPage(orderID)
	} else {
		b = make([]byte, 4)
	}
	if _, err := io.ReadFull(r, b[:4]); err != nil {
		return 0, nil, err
	}
	length, _ := unmarshalUint32(b)
	if length > maxMsgLength {
		debug("recv packet %d bytes too long", length)
		return 0, nil, errLongPacket
	}
	if length == 0 {
		debug("recv packet of 0 bytes too short")
		return 0, nil, errShortPacket
	}
	if alloc == nil {
		b = make([]byte, length)
	}
	if _, err := io.ReadFull(r, b[:length]); err != nil {
		debug("recv packet %d bytes: err %v", length, err)
		return 0, nil, err
	}
	if debugDumpRxPacketBytes {
		debug("recv packet: %s %d bytes %x", fxp(b[0]), length, b[1:length])
	} else if debugDumpRxPacket {
		debug("recv packet: %s %d bytes", fxp(b[0]), length)
	}
	return b[0], b[1:length], nil
}

type extensionPair struct {
	Name string
	Data string
}

func unmarshalExtensionPair(b []byte) (extensionPair, []byte, error) {
	var ep extensionPair
	var err error
	ep.Name, b, err = unmarshalStringSafe(b)
	if err != nil {
		return ep, b, err
	}
	ep.Data, b, err = unmarshalStringSafe(b)
	return ep, b, err
}

// Here starts the definition of packets along with their MarshalBinary
// implementations.
// Manually writing the marshalling logic wins us a lot of time and
// allocation.

type sshFxInitPacket struct {
	Version    uint32
	Extensions []extensionPair
}

func (p *sshFxInitPacket) MarshalBinary() ([]byte, error) {
	l := 4 + 1 + 4 // uint32(length) + byte(type) + uint32(version)
	for _, e := range p.Extensions {
		l += 4 + len(e.Name) + 4 + len(e.Data)
	}

	b := make([]byte, 4, l)
	b = append(b, sshFxpInit)
	b = marshalUint32(b, p.Version)

	for _, e := range p.Extensions {
		b = marshalString(b, e.Name)
		b = marshalString(b, e.Data)
	}

	return b, nil
}

func (p *sshFxInitPacket) UnmarshalBinary(b []byte) error {
	var err error
	if p.Version, b, err = unmarshalUint32Safe(b); err != nil {
		return err
	}
	for len(b) > 0 {
		var ep extensionPair
		ep, b, err = unmarshalExtensionPair(b)
		if err != nil {
			return err
		}
		p.Extensions = append(p.Extensions, ep)
	}
	return nil
}

type sshFxVersionPacket struct {
	Version    uint32
	Extensions []sshExtensionPair
}

type sshExtensionPair struct {
	Name, Data string
}

func (p *sshFxVersionPacket) MarshalBinary() ([]byte, error) {
	l := 4 + 1 + 4 // uint32(length) + byte(type) + uint32(version)
	for _, e := range p.Extensions {
		l += 4 + len(e.Name) + 4 + len(e.Data)
	}

	b := make([]byte, 4, l)
	b = append(b, sshFxpVersion)
	b = marshalUint32(b, p.Version)

	for _, e := range p.Extensions {
		b = marshalString(b, e.Name)
		b = marshalString(b, e.Data)
	}

	return b, nil
}

func marshalIDStringPacket(packetType byte, id uint32, str string) ([]byte, error) {
	l := 4 + 1 + 4 + // uint32(length) + byte(type) + uint32(id)
		4 + len(str)

	b := make([]byte, 4, l)
	b = append(b, packetType)
	b = marshalUint32(b, id)
	b = marshalString(b, str)

	return b, nil
}

func unmarshalIDString(b []byte, id *uint32, str *string) error {
	var err error
	*id, b, err = unmarshalUint32Safe(b)
	if err != nil {
		return err
	}
	*str, _, err = unmarshalStringSafe(b)
	return err
}

type sshFxpReaddirPacket struct {
	ID     uint32
	Handle string
}

func (p *sshFxpReaddirPacket) id() uint32 { return p.ID }

func (p *sshFxpReaddirPacket) MarshalBinary() ([]byte, error) {
	return marshalIDStringPacket(sshFxpReaddir, p.ID, p.Handle)
}

func (p *sshFxpReaddirPacket) UnmarshalBinary(b []byte) error {
	return unmarshalIDString(b, &p.ID, &p.Handle)
}

type sshFxpOpendirPacket struct {
	ID   uint32
	Path string
}

func (p *sshFxpOpendirPacket) id() uint32 { return p.ID }

func (p *sshFxpOpendirPacket) MarshalBinary() ([]byte, error) {
	return marshalIDStringPacket(sshFxpOpendir, p.ID, p.Path)
}

func (p *sshFxpOpendirPacket) UnmarshalBinary(b []byte) error {
	return unmarshalIDString(b, &p.ID, &p.Path)
}

type sshFxpLstatPacket struct {
	ID   uint32
	Path string
}

func (p *sshFxpLstatPacket) id() uint32 { return p.ID }

func (p *sshFxpLstatPacket) MarshalBinary() ([]byte, error) {
	return marshalIDStringPacket(sshFxpLstat, p.ID, p.Path)
}

func (p *sshFxpLstatPacket) UnmarshalBinary(b []byte) error {
	return unmarshalIDString(b, &p.ID, &p.Path)
}

type sshFxpStatPacket struct {
	ID   uint32
	Path string
}

func (p *sshFxpStatPacket) id() uint32 { return p.ID }

func (p *sshFxpStatPacket) MarshalBinary() ([]byte, error) {
	return marshalIDStringPacket(sshFxpStat, p.ID, p.Path)
}

func (p *sshFxpStatPacket) UnmarshalBinary(b []byte) error {
	return unmarshalIDString(b, &p.ID, &p.Path)
}

type sshFxpFstatPacket struct {
	ID     uint32
	Handle string
}

func (p *sshFxpFstatPacket) id() uint32 { return p.ID }

func (p *sshFxpFstatPacket) MarshalBinary() ([]byte, error) {
	return marshalIDStringPacket(sshFxpFstat, p.ID, p.Handle)
}

func (p *sshFxpFstatPacket) UnmarshalBinary(b []byte) error {
	return unmarshalIDString(b, &p.ID, &p.Handle)
}

type sshFxpClosePacket struct {
	ID     uint32
	Handle string
}

func (p *sshFxpClosePacket) id() uint32 { return p.ID }

func (p *sshFxpClosePacket) MarshalBinary() ([]byte, error) {
	return marshalIDStringPacket(sshFxpClose, p.ID, p.Handle)
}

func (p *sshFxpClosePacket) UnmarshalBinary(b []byte) error {
	return unmarshalIDString(b, &p.ID, &p.Handle)
}

type sshFxpRemovePacket struct {
	ID       uint32
	Filename string
}

func (p *sshFxpRemovePacket) id() uint32 { return p.ID }

func (p *sshFxpRemovePacket) MarshalBinary() ([]byte, error) {
	return marshalIDStringPacket(sshFxpRemove, p.ID, p.Filename)
}

func (p *sshFxpRemovePacket) UnmarshalBinary(b []byte) error {
	return unmarshalIDString(b, &p.ID, &p.Filename)
}

type sshFxpRmdirPacket struct {
	ID   uint32
	Path string
}

func (p *sshFxpRmdirPacket) id() uint32 { return p.ID }

func (p *sshFxpRmdirPacket) MarshalBinary() ([]byte, error) {
	return marshalIDStringPacket(sshFxpRmdir, p.ID, p.Path)
}

func (p *sshFxpRmdirPacket) UnmarshalBinary(b []byte) error {
	return unmarshalIDString(b, &p.ID, &p.Path)
}

type sshFxpSymlinkPacket struct {
	ID         uint32
	Targetpath string
	Linkpath   string
}

func (p *sshFxpSymlinkPacket) id() uint32 { return p.ID }

func (p *sshFxpSymlinkPacket) MarshalBinary() ([]byte, error) {
	l := 4 + 1 + 4 + // uint32(length) + byte(type) + uint32(id)
		4 + len(p.Targetpath) +
		4 + len(p.Linkpath)

	b := make([]byte, 4, l)
	b = append(b, sshFxpSymlink)
	b = marshalUint32(b, p.ID)
	b = marshalString(b, p.Targetpath)
	b = marshalString(b, p.Linkpath)

	return b, nil
}

func (p *sshFxpSymlinkPacket) UnmarshalBinary(b []byte) error {
	var err error
	if p.ID, b, err = unmarshalUint32Safe(b); err != nil {
		return err
	} else if p.Targetpath, b, err = unmarshalStringSafe(b); err != nil {
		return err
	} else if p.Linkpath, _, err = unmarshalStringSafe(b); err != nil {
		return err
	}
	return nil
}

type sshFxpHardlinkPacket struct {
	ID      uint32
	Oldpath string
	Newpath string
}

func (p *sshFxpHardlinkPacket) id() uint32 { return p.ID }

func (p *sshFxpHardlinkPacket) MarshalBinary() ([]byte, error) {
	const ext = "hardlink@openssh.com"
	l := 4 + 1 + 4 + // uint32(length) + byte(type) + uint32(id)
		4 + len(ext) +
		4 + len(p.Oldpath) +
		4 + len(p.Newpath)

	b := make([]byte, 4, l)
	b = append(b, sshFxpExtended)
	b = marshalUint32(b, p.ID)
	b = marshalString(b, ext)
	b = marshalString(b, p.Oldpath)
	b = marshalString(b, p.Newpath)

	return b, nil
}

type sshFxpReadlinkPacket struct {
	ID   uint32
	Path string
}

func (p *sshFxpReadlinkPacket) id() uint32 { return p.ID }

func (p *sshFxpReadlinkPacket) MarshalBinary() ([]byte, error) {
	return marshalIDStringPacket(sshFxpReadlink, p.ID, p.Path)
}

func (p *sshFxpReadlinkPacket) UnmarshalBinary(b []byte) error {
	return unmarshalIDString(b, &p.ID, &p.Path)
}

type sshFxpRealpathPacket struct {
	ID   uint32
	Path string
}

func (p *sshFxpRealpathPacket) id() uint32 { return p.ID }

func (p *sshFxpRealpathPacket) MarshalBinary() ([]byte, error) {
	return marshalIDStringPacket(sshFxpRealpath, p.ID, p.Path)
}

func (p *sshFxpRealpathPacket) UnmarshalBinary(b []byte) error {
	return unmarshalIDString(b, &p.ID, &p.Path)
}

type sshFxpNameAttr struct {
	Name     string
	LongName string
	Attrs    []interface{}
}

func (p *sshFxpNameAttr) MarshalBinary() ([]byte, error) {
	var b []byte
	b = marshalString(b, p.Name)
	b = marshalString(b, p.LongName)
	for _, attr := range p.Attrs {
		b = marshal(b, attr)
	}
	return b, nil
}

type sshFxpNamePacket struct {
	ID        uint32
	NameAttrs []*sshFxpNameAttr
}

func (p *sshFxpNamePacket) marshalPacket() ([]byte, []byte, error) {
	l := 4 + 1 + 4 + // uint32(length) + byte(type) + uint32(id)
		4

	b := make([]byte, 4, l)
	b = append(b, sshFxpName)
	b = marshalUint32(b, p.ID)
	b = marshalUint32(b, uint32(len(p.NameAttrs)))

	var payload []byte
	for _, na := range p.NameAttrs {
		ab, err := na.MarshalBinary()
		if err != nil {
			return nil, nil, err
		}

		payload = append(payload, ab...)
	}

	return b, payload, nil
}

func (p *sshFxpNamePacket) MarshalBinary() ([]byte, error) {
	header, payload, err := p.marshalPacket()
	return append(header, payload...), err
}

type sshFxpOpenPacket struct {
	ID     uint32
	Path   string
	Pflags uint32
	Flags  uint32 // ignored
}

func (p *sshFxpOpenPacket) id() uint32 { return p.ID }

func (p *sshFxpOpenPacket) MarshalBinary() ([]byte, error) {
	l := 4 + 1 + 4 + // uint32(length) + byte(type) + uint32(id)
		4 + len(p.Path) +
		4 + 4

	b := make([]byte, 4, l)
	b = append(b, sshFxpOpen)
	b = marshalUint32(b, p.ID)
	b = marshalString(b, p.Path)
	b = marshalUint32(b, p.Pflags)
	b = marshalUint32(b, p.Flags)

	return b, nil
}

func (p *sshFxpOpenPacket) UnmarshalBinary(b []byte) error {
	var err error
	if p.ID, b, err = unmarshalUint32Safe(b); err != nil {
		return err
	} else if p.Path, b, err = unmarshalStringSafe(b); err != nil {
		return err
	} else if p.Pflags, b, err = unmarshalUint32Safe(b); err != nil {
		return err
	} else if p.Flags, _, err = unmarshalUint32Safe(b); err != nil {
		return err
	}
	return nil
}

type sshFxpReadPacket struct {
	ID     uint32
	Len    uint32
	Offset uint64
	Handle string
}

func (p *sshFxpReadPacket) id() uint32 { return p.ID }

func (p *sshFxpReadPacket) MarshalBinary() ([]byte, error) {
	l := 4 + 1 + 4 + // uint32(length) + byte(type) + uint32(id)
		4 + len(p.Handle) +
		8 + 4 // uint64 + uint32

	b := make([]byte, 4, l)
	b = append(b, sshFxpRead)
	b = marshalUint32(b, p.ID)
	b = marshalString(b, p.Handle)
	b = marshalUint64(b, p.Offset)
	b = marshalUint32(b, p.Len)

	return b, nil
}

func (p *sshFxpReadPacket) UnmarshalBinary(b []byte) error {
	var err error
	if p.ID, b, err = unmarshalUint32Safe(b); err != nil {
		return err
	} else if p.Handle, b, err = unmarshalStringSafe(b); err != nil {
		return err
	} else if p.Offset, b, err = unmarshalUint64Safe(b); err != nil {
		return err
	} else if p.Len, _, err = unmarshalUint32Safe(b); err != nil {
		return err
	}
	return nil
}

// We need allocate bigger slices with extra capacity to avoid a re-allocation in sshFxpDataPacket.MarshalBinary
// So, we need: uint32(length) + byte(type) + uint32(id) + uint32(data_length)
const dataHeaderLen = 4 + 1 + 4 + 4

func (p *sshFxpReadPacket) getDataSlice(alloc *allocator, orderID uint32) []byte {
	dataLen := clamp(p.Len, maxTxPacket)
	if alloc != nil {
		// GetPage returns a slice with capacity = maxMsgLength this is enough to avoid new allocations in
		// sshFxpDataPacket.MarshalBinary
		return alloc.GetPage(orderID)[:dataLen]
	}
	// allocate with extra space for the header
	return make([]byte, dataLen, dataLen+dataHeaderLen)
}

type sshFxpRenamePacket struct {
	ID      uint32
	Oldpath string
	Newpath string
}

func (p *sshFxpRenamePacket) id() uint32 { return p.ID }

func (p *sshFxpRenamePacket) MarshalBinary() ([]byte, error) {
	l := 4 + 1 + 4 + // uint32(length) + byte(type) + uint32(id)
		4 + len(p.Oldpath) +
		4 + len(p.Newpath)

	b := make([]byte, 4, l)
	b = append(b, sshFxpRename)
	b = marshalUint32(b, p.ID)
	b = marshalString(b, p.Oldpath)
	b = marshalString(b, p.Newpath)

	return b, nil
}

func (p *sshFxpRenamePacket) UnmarshalBinary(b []byte) error {
	var err error
	if p.ID, b, err = unmarshalUint32Safe(b); err != nil {
		return err
	} else if p.Oldpath, b, err = unmarshalStringSafe(b); err != nil {
		return err
	} else if p.Newpath, _, err = unmarshalStringSafe(b); err != nil {
		return err
	}
	return nil
}

type sshFxpPosixRenamePacket struct {
	ID      uint32
	Oldpath string
	Newpath string
}

func (p *sshFxpPosixRenamePacket) id() uint32 { return p.ID }

func (p *sshFxpPosixRenamePacket) MarshalBinary() ([]byte, error) {
	const ext = "posix-rename@openssh.com"
	l := 4 + 1 + 4 + // uint32(length) + byte(type) + uint32(id)
		4 + len(ext) +
		4 + len(p.Oldpath) +
		4 + len(p.Newpath)

	b := make([]byte, 4, l)
	b = append(b, sshFxpExtended)
	b = marshalUint32(b, p.ID)
	b = marshalString(b, ext)
	b = marshalString(b, p.Oldpath)
	b = marshalString(b, p.Newpath)

	return b, nil
}

type sshFxpWritePacket struct {
	ID     uint32
	Length uint32
	Offset uint64
	Handle string
	Data   []byte
}

func (p *sshFxpWritePacket) id() uint32 { return p.ID }

func (p *sshFxpWritePacket) marshalPacket() ([]byte, []byte, error) {
	l := 4 + 1 + 4 + // uint32(length) + byte(type) + uint32(id)
		4 + len(p.Handle) +
		8 + // uint64
		4

	b := make([]byte, 4, l)
	b = append(b, sshFxpWrite)
	b = marshalUint32(b, p.ID)
	b = marshalString(b, p.Handle)
	b = marshalUint64(b, p.Offset)
	b = marshalUint32(b, p.Length)

	return b, p.Data, nil
}

func (p *sshFxpWritePacket) MarshalBinary() ([]byte, error) {
	header, payload, err := p.marshalPacket()
	return append(header, payload...), err
}

func (p *sshFxpWritePacket) UnmarshalBinary(b []byte) error {
	var err error
	if p.ID, b, err = unmarshalUint32Safe(b); err != nil {
		return err
	} else if p.Handle, b, err = unmarshalStringSafe(b); err != nil {
		return err
	} else if p.Offset, b, err = unmarshalUint64Safe(b); err != nil {
		return err
	} else if p.Length, b, err = unmarshalUint32Safe(b); err != nil {
		return err
	} else if uint32(len(b)) < p.Length {
		return errShortPacket
	}

	p.Data = b[:p.Length]
	return nil
}

type sshFxpMkdirPacket struct {
	ID    uint32
	Flags uint32 // ignored
	Path  string
}

func (p *sshFxpMkdirPacket) id() uint32 { return p.ID }

func (p *sshFxpMkdirPacket) MarshalBinary() ([]byte, error) {
	l := 4 + 1 + 4 + // uint32(length) + byte(type) + uint32(id)
		4 + len(p.Path) +
		4 // uint32

	b := make([]byte, 4, l)
	b = append(b, sshFxpMkdir)
	b = marshalUint32(b, p.ID)
	b = marshalString(b, p.Path)
	b = marshalUint32(b, p.Flags)

	return b, nil
}

func (p *sshFxpMkdirPacket) UnmarshalBinary(b []byte) error {
	var err error
	if p.ID, b, err = unmarshalUint32Safe(b); err != nil {
		return err
	} else if p.Path, b, err = unmarshalStringSafe(b); err != nil {
		return err
	} else if p.Flags, _, err = unmarshalUint32Safe(b); err != nil {
		return err
	}
	return nil
}

type sshFxpSetstatPacket struct {
	ID    uint32
	Flags uint32
	Path  string
	Attrs interface{}
}

type sshFxpFsetstatPacket struct {
	ID     uint32
	Flags  uint32
	Handle string
	Attrs  interface{}
}

func (p *sshFxpSetstatPacket) id() uint32  { return p.ID }
func (p *sshFxpFsetstatPacket) id() uint32 { return p.ID }

func (p *sshFxpSetstatPacket) marshalPacket() ([]byte, []byte, error) {
	l := 4 + 1 + 4 + // uint32(length) + byte(type) + uint32(id)
		4 + len(p.Path) +
		4 // uint32

	b := make([]byte, 4, l)
	b = append(b, sshFxpSetstat)
	b = marshalUint32(b, p.ID)
	b = marshalString(b, p.Path)
	b = marshalUint32(b, p.Flags)

	payload := marshal(nil, p.Attrs)

	return b, payload, nil
}

func (p *sshFxpSetstatPacket) MarshalBinary() ([]byte, error) {
	header, payload, err := p.marshalPacket()
	return append(header, payload...), err
}

func (p *sshFxpFsetstatPacket) marshalPacket() ([]byte, []byte, error) {
	l := 4 + 1 + 4 + // uint32(length) + byte(type) + uint32(id)
		4 + len(p.Handle) +
		4 // uint32

	b := make([]byte, 4, l)
	b = append(b, sshFxpFsetstat)
	b = marshalUint32(b, p.ID)
	b = marshalString(b, p.Handle)
	b = marshalUint32(b, p.Flags)

	payload := marshal(nil, p.Attrs)

	return b, payload, nil
}

func (p *sshFxpFsetstatPacket) MarshalBinary() ([]byte, error) {
	header, payload, err := p.marshalPacket()
	return append(header, payload...), err
}

func (p *sshFxpSetstatPacket) UnmarshalBinary(b []byte) error {
	var err error
	if p.ID, b, err = unmarshalUint32Safe(b); err != nil {
		return err
	} else if p.Path, b, err = unmarshalStringSafe(b); err != nil {
		return err
	} else if p.Flags, b, err = unmarshalUint32Safe(b); err != nil {
		return err
	}
	p.Attrs = b
	return nil
}

func (p *sshFxpFsetstatPacket) UnmarshalBinary(b []byte) error {
	var err error
	if p.ID, b, err = unmarshalUint32Safe(b); err != nil {
		return err
	} else if p.Handle, b, err = unmarshalStringSafe(b); err != nil {
		return err
	} else if p.Flags, b, err = unmarshalUint32Safe(b); err != nil {
		return err
	}
	p.Attrs = b
	return nil
}

type sshFxpHandlePacket struct {
	ID     uint32
	Handle string
}

func (p *sshFxpHandlePacket) MarshalBinary() ([]byte, error) {
	l := 4 + 1 + 4 + // uint32(length) + byte(type) + uint32(id)
		4 + len(p.Handle)

	b := make([]byte, 4, l)
	b = append(b, sshFxpHandle)
	b = marshalUint32(b, p.ID)
	b = marshalString(b, p.Handle)

	return b, nil
}

type sshFxpStatusPacket struct {
	ID uint32
	StatusError
}

func (p *sshFxpStatusPacket) MarshalBinary() ([]byte, error) {
	l := 4 + 1 + 4 + // uint32(length) + byte(type) + uint32(id)
		4 +
		4 + len(p.StatusError.msg) +
		4 + len(p.StatusError.lang)

	b := make([]byte, 4, l)
	b = append(b, sshFxpStatus)
	b = marshalUint32(b, p.ID)
	b = marshalStatus(b, p.StatusError)

	return b, nil
}

type sshFxpDataPacket struct {
	ID     uint32
	Length uint32
	Data   []byte
}

func (p *sshFxpDataPacket) marshalPacket() ([]byte, []byte, error) {
	l := 4 + 1 + 4 + // uint32(length) + byte(type) + uint32(id)
		4

	b := make([]byte, 4, l)
	b = append(b, sshFxpData)
	b = marshalUint32(b, p.ID)
	b = marshalUint32(b, p.Length)

	return b, p.Data, nil
}

// MarshalBinary encodes the receiver into a binary form and returns the result.
// To avoid a new allocation the Data slice must have a capacity >= Length + 9
//
// This is hand-coded rather than just append(header, payload...),
// in order to try and reuse the r.Data backing store in the packet.
func (p *sshFxpDataPacket) MarshalBinary() ([]byte, error) {
	b := append(p.Data, make([]byte, dataHeaderLen)...)
	copy(b[dataHeaderLen:], p.Data[:p.Length])
	// b[0:4] will be overwritten with the length in sendPacket
	b[4] = sshFxpData
	binary.BigEndian.PutUint32(b[5:9], p.ID)
	binary.BigEndian.PutUint32(b[9:13], p.Length)
	return b, nil
}

func (p *sshFxpDataPacket) UnmarshalBinary(b []byte) error {
	var err error
	if p.ID, b, err = unmarshalUint32Safe(b); err != nil {
		return err
	} else if p.Length, b, err = unmarshalUint32Safe(b); err != nil {
		return err
	} else if uint32(len(b)) < p.Length {
		return errShortPacket
	}

	p.Data = b[:p.Length]
	return nil
}

type sshFxpStatvfsPacket struct {
	ID   uint32
	Path string
}

func (p *sshFxpStatvfsPacket) id() uint32 { return p.ID }

func (p *sshFxpStatvfsPacket) MarshalBinary() ([]byte, error) {
	const ext = "statvfs@openssh.com"
	l := 4 + 1 + 4 + // uint32(length) + byte(type) + uint32(id)
		4 + len(ext) +
		4 + len(p.Path)

	b := make([]byte, 4, l)
	b = append(b, sshFxpExtended)
	b = marshalUint32(b, p.ID)
	b = marshalString(b, ext)
	b = marshalString(b, p.Path)

	return b, nil
}

// A StatVFS contains statistics about a filesystem.
type StatVFS struct {
	ID      uint32
	Bsize   uint64 /* file system block size */
	Frsize  uint64 /* fundamental fs block size */
	Blocks  uint64 /* number of blocks (unit f_frsize) */
	Bfree   uint64 /* free blocks in file system */
	Bavail  uint64 /* free blocks for non-root */
	Files   uint64 /* total file inodes */
	Ffree   uint64 /* free file inodes */
	Favail  uint64 /* free file inodes for to non-root */
	Fsid    uint64 /* file system id */
	Flag    uint64 /* bit mask of f_flag values */
	Namemax uint64 /* maximum filename length */
}

// TotalSpace calculates the amount of total space in a filesystem.
func (p *StatVFS) TotalSpace() uint64 {
	return p.Frsize * p.Blocks
}

// FreeSpace calculates the amount of free space in a filesystem.
func (p *StatVFS) FreeSpace() uint64 {
	return p.Frsize * p.Bfree
}

// marshalPacket converts to ssh_FXP_EXTENDED_REPLY packet binary format
func (p *StatVFS) marshalPacket() ([]byte, []byte, error) {
	header := []byte{0, 0, 0, 0, sshFxpExtendedReply}

	var buf bytes.Buffer
	err := binary.Write(&buf, binary.BigEndian, p)

	return header, buf.Bytes(), err
}

func (p *StatVFS) MarshalBinary() ([]byte, error) {
	header, payload, err := p.marshalPacket()
	return append(header, payload...), err
}

type sshFxpFsyncPacket struct {
	ID     uint32
	Handle string
}

func (p *sshFxpFsyncPacket) id() uint32 { return p.ID }

func (p *sshFxpFsyncPacket) MarshalBinary() ([]byte, error) {
	const ext = "fsync@openssh.com"
	l := 4 + 1 + 4 + // uint32(length) + byte(type) + uint32(id)
		4 + len(ext) +
		4 + len(p.Handle)

	b := make([]byte, 4, l)
	b = append(b, sshFxpExtended)
	b = marshalUint32(b, p.ID)
	b = marshalString(b, ext)
	b = marshalString(b, p.Handle)

	return b, nil
}

type sshFxpExtendedPacket struct {
	ID              uint32
	ExtendedRequest string
	SpecificPacket  interface {
		serverRespondablePacket
		readonly() bool
	}
}

func (p *sshFxpExtendedPacket) id() uint32 { return p.ID }
func (p *sshFxpExtendedPacket) readonly() bool {
	if p.SpecificPacket == nil {
		return true
	}
	return p.SpecificPacket.readonly()
}

func (p *sshFxpExtendedPacket) respond(svr *Server) responsePacket {
	if p.SpecificPacket == nil {
		return statusFromError(p.ID, nil)
	}
	return p.SpecificPacket.respond(svr)
}

func (p *sshFxpExtendedPacket) UnmarshalBinary(b []byte) error {
	var err error
	bOrig := b
	if p.ID, b, err = unmarshalUint32Safe(b); err != nil {
		return err
	} else if p.ExtendedRequest, _, err = unmarshalStringSafe(b); err != nil {
		return err
	}

	// specific unmarshalling
	switch p.ExtendedRequest {
	case "statvfs@openssh.com":
		p.SpecificPacket = &sshFxpExtendedPacketStatVFS{}
	case "posix-rename@openssh.com":
		p.SpecificPacket = &sshFxpExtendedPacketPosixRename{}
	case "hardlink@openssh.com":
		p.SpecificPacket = &sshFxpExtendedPacketHardlink{}
	default:
		return errors.Wrapf(errUnknownExtendedPacket, "packet type %v", p.SpecificPacket)
	}

	return p.SpecificPacket.UnmarshalBinary(bOrig)
}

type sshFxpExtendedPacketStatVFS struct {
	ID              uint32
	ExtendedRequest string
	Path            string
}

func (p *sshFxpExtendedPacketStatVFS) id() uint32     { return p.ID }
func (p *sshFxpExtendedPacketStatVFS) readonly() bool { return true }
func (p *sshFxpExtendedPacketStatVFS) UnmarshalBinary(b []byte) error {
	var err error
	if p.ID, b, err = unmarshalUint32Safe(b); err != nil {
		return err
	} else if p.ExtendedRequest, b, err = unmarshalStringSafe(b); err != nil {
		return err
	} else if p.Path, _, err = unmarshalStringSafe(b); err != nil {
		return err
	}
	return nil
}

type sshFxpExtendedPacketPosixRename struct {
	ID              uint32
	ExtendedRequest string
	Oldpath         string
	Newpath         string
}

func (p *sshFxpExtendedPacketPosixRename) id() uint32     { return p.ID }
func (p *sshFxpExtendedPacketPosixRename) readonly() bool { return false }
func (p *sshFxpExtendedPacketPosixRename) UnmarshalBinary(b []byte) error {
	var err error
	if p.ID, b, err = unmarshalUint32Safe(b); err != nil {
		return err
	} else if p.ExtendedRequest, b, err = unmarshalStringSafe(b); err != nil {
		return err
	} else if p.Oldpath, b, err = unmarshalStringSafe(b); err != nil {
		return err
	} else if p.Newpath, _, err = unmarshalStringSafe(b); err != nil {
		return err
	}
	return nil
}

func (p *sshFxpExtendedPacketPosixRename) respond(s *Server) responsePacket {
	err := os.Rename(p.Oldpath, p.Newpath)
	return statusFromError(p.ID, err)
}

type sshFxpExtendedPacketHardlink struct {
	ID              uint32
	ExtendedRequest string
	Oldpath         string
	Newpath         string
}

// https://github.com/openssh/openssh-portable/blob/master/PROTOCOL
func (p *sshFxpExtendedPacketHardlink) id() uint32     { return p.ID }
func (p *sshFxpExtendedPacketHardlink) readonly() bool { return true }
func (p *sshFxpExtendedPacketHardlink) UnmarshalBinary(b []byte) error {
	var err error
	if p.ID, b, err = unmarshalUint32Safe(b); err != nil {
		return err
	} else if p.ExtendedRequest, b, err = unmarshalStringSafe(b); err != nil {
		return err
	} else if p.Oldpath, b, err = unmarshalStringSafe(b); err != nil {
		return err
	} else if p.Newpath, _, err = unmarshalStringSafe(b); err != nil {
		return err
	}
	return nil
}

func (p *sshFxpExtendedPacketHardlink) respond(s *Server) responsePacket {
	err := os.Link(p.Oldpath, p.Newpath)
	return statusFromError(p.ID, err)
}
