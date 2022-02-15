package utils

import (
	"bytes"
	"encoding/json"
)

func Marshal(i interface{}) ([]byte, error) {
	buffer := bytes.NewBuffer([]byte{})
	encoder := json.NewEncoder(buffer)
	encoder.SetEscapeHTML(false)
	err := encoder.Encode(i)
	return buffer.Bytes(), err
}
