package hash

import (
	"crypto/md5"
	"testing"

	"github.com/stretchr/testify/assert"
)

type TestStruct struct {
	Name   string
	Number int
	Data   map[string]string
}

func TestDeepHashObject(t *testing.T) {
	tests := []struct {
		name     string
		input    interface{}
		expected string
	}{
		{
			name:     "nil input",
			input:    nil,
			expected: "d41d8cd98f00b204e9800998ecf8427e",
		},
		{
			name:     "string input",
			input:    "test",
			expected: "098f6bcd4621d373cade4e832627b4f6",
		},
		{
			name: "struct input",
			input: TestStruct{
				Name:   "test",
				Number: 123,
				Data: map[string]string{
					"key": "value",
				},
			},
			expected: "c50766c0b1bc781ac13df9a84f42b598",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			hasher := md5.New()
			DeepHashObject(hasher, tt.input)
			result := HashToString(tt.input)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestHashToString(t *testing.T) {
	tests := []struct {
		name     string
		input    interface{}
		expected string
	}{
		{
			name:     "nil input",
			input:    nil,
			expected: "d41d8cd98f00b204e9800998ecf8427e",
		},
		{
			name:     "string input",
			input:    "test",
			expected: "098f6bcd4621d373cade4e832627b4f6",
		},
		{
			name: "complex struct",
			input: TestStruct{
				Name:   "test",
				Number: 123,
				Data: map[string]string{
					"key": "value",
				},
			},
			expected: "c50766c0b1bc781ac13df9a84f42b598",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := HashToString(tt.input)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestHash(t *testing.T) {
	tests := []struct {
		name     string
		input    interface{}
		expected string
	}{
		{
			name:     "nil input",
			input:    nil,
			expected: "null",
		},
		{
			name:     "string input",
			input:    "test",
			expected: "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
		},
		{
			name: "struct input",
			input: TestStruct{
				Name:   "test",
				Number: 123,
				Data: map[string]string{
					"key": "value",
				},
			},
			expected: "4ff34eca3b89ac3e95719c62190db3e1b98377b57e4c26f9f257fa9df1958bab",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := Hash(tt.input)
			assert.Equal(t, tt.expected, result)
		})
	}
}
