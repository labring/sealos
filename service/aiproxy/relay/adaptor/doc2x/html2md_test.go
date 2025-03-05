package doc2x_test

import (
	"context"
	"testing"

	"github.com/labring/sealos/service/aiproxy/relay/adaptor/doc2x"
)

var html = `<img src="https://cdn.noedgeai.com/01956426-b164-730d-a1fe-8be8972145d6_0.jpg?x=258&y=694&w=1132&h=826"/>

<table><tr><td>sadsa</td><td/><td/></tr><tr><td/><td>sadasdsa</td><td>sad</td></tr><tr><td/><td/><td>dsadsadsa</td></tr><tr><td/><td/><td/></tr></table>

<!-- Media -->`

func TestHTMLTable2Md(t *testing.T) {
	result := doc2x.HTMLTable2Md(html)
	t.Log(result)
}

func TestInlineMdImage(t *testing.T) {
	result := doc2x.InlineMdImage(context.Background(), html)
	t.Log(result)
}
