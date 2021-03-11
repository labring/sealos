package install

import "sync"

type uPool struct {
	queue chan int
	wg    *sync.WaitGroup
}

func NewPool(size int) *uPool {
	if size <= 1 {
		size = 1
	}
	return &uPool{
		queue: make(chan int, size),
		wg:    &sync.WaitGroup{},
	}
}

func (p *uPool) Add(delta int) {
	for i := 0; i < delta; i++ {
		p.queue <- 1
	}
	for i := 0; i > delta; i-- {
		<-p.queue
	}
	p.wg.Add(delta)
}

func (p *uPool) Done() {
	<-p.queue
	p.wg.Done()
}

func (p *uPool) Wait() {
	p.wg.Wait()
}
