package splitter

import "bytes"

type Splitter struct {
	head           []byte
	tail           []byte
	headLen        int
	tailLen        int
	buffer         []byte
	state          int
	partialTailPos int
	kmpNext        []int
}

func NewSplitter(head, tail []byte) *Splitter {
	return &Splitter{
		head:    head,
		tail:    tail,
		headLen: len(head),
		tailLen: len(tail),
		kmpNext: computeKMPNext(tail),
	}
}

func computeKMPNext(pattern []byte) []int {
	n := len(pattern)
	next := make([]int, n)
	if n == 0 {
		return next
	}
	next[0] = 0
	for i := 1; i < n; i++ {
		j := next[i-1]
		for j > 0 && pattern[i] != pattern[j] {
			j = next[j-1]
		}
		if pattern[i] == pattern[j] {
			j++
		}
		next[i] = j
	}
	return next
}

func (s *Splitter) Process(data []byte) ([]byte, []byte) {
	if len(data) == 0 {
		return nil, nil
	}
	switch s.state {
	case 0:
		s.buffer = append(s.buffer, data...)
		bufferLen := len(s.buffer)
		minLen := bufferLen
		if minLen > s.headLen {
			minLen = s.headLen
		}
		if minLen > 0 {
			if !bytes.Equal(s.buffer[:minLen], s.head[:minLen]) {
				s.state = 2
				remaining := s.buffer
				s.buffer = nil
				return nil, remaining
			}
		}

		if bufferLen < s.headLen {
			return nil, nil
		}

		s.state = 1
		s.buffer = s.buffer[s.headLen:]
		if len(s.buffer) == 0 {
			return nil, nil
		}
		return s.processSeekTail()
	case 1:
		s.buffer = append(s.buffer, data...)
		return s.processSeekTail()
	default:
		return nil, data
	}
}

func (s *Splitter) processSeekTail() ([]byte, []byte) {
	data := s.buffer
	j := s.partialTailPos
	tail := s.tail
	tailLen := s.tailLen
	kmpNext := s.kmpNext

	var i int
	for i = 0; i < len(data); i++ {
		for j > 0 && data[i] != tail[j] {
			j = kmpNext[j-1]
		}
		if data[i] == tail[j] {
			j++
			if j == tailLen {
				end := i - tailLen + 1
				if end < 0 {
					end = 0
				}
				result := data[:end]
				remaining := data[i+1:]
				s.buffer = nil
				s.state = 2
				s.partialTailPos = 0
				return result, remaining
			}
		}
	}
	splitAt := len(data) - j
	if splitAt < 0 {
		splitAt = 0
	}
	result := data[:splitAt]
	remainingPart := data[splitAt:]
	s.partialTailPos = j
	s.buffer = remainingPart
	return result, nil
}
