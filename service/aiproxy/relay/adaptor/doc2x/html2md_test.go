package doc2x_test

import (
	"context"
	"testing"

	"github.com/labring/sealos/service/aiproxy/relay/adaptor/doc2x"
)

func TestHTMLTable2Md(t *testing.T) {
	tables := []struct {
		name     string
		html     string
		expected string
	}{
		{
			name: "basic table",
			html: `<table><tr><td>sadsa</td><td/><td/></tr><tr><td/><td>sadasdsa</td><td>sad</td></tr><tr><td/><td/><td>dsadsadsa</td></tr><tr><td/><td/><td/></tr></table>`,
			expected: `| sadsa |  |  |
| --- | --- | --- |
|  | sadasdsa | sad |
|  |  | dsadsadsa |
|  |  |  |`,
		},
		{
			name: "simple table",
			html: `<table><tr><td>Header 1</td><td>Header 2</td></tr><tr><td>Data 1</td><td>Data 2</td></tr></table>`,
			expected: `| Header 1 | Header 2 |
| --- | --- |
| Data 1 | Data 2 |`,
		},
		{
			name: "empty table",
			html: `<table><tr><td></td><td></td></tr><tr><td></td><td></td></tr></table>`,
			expected: `|  |  |
| --- | --- |
|  |  |`,
		},
	}

	for _, tc := range tables {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			result := doc2x.HTMLTable2Md(tc.html)

			if result != tc.expected {
				t.Errorf("Expected:\n%s\nGot:\n%s", tc.expected, result)
			}
		})
	}
}

var htmlImage = `<img src="https://cdn.noedgeai.com/01956426-b164-730d-a1fe-8be8972145d6_0.jpg?x=258&y=694&w=1132&h=826"/>`

func TestInlineMdImage(t *testing.T) {
	result := doc2x.InlineMdImage(context.Background(), htmlImage)
	t.Log(result)
}
