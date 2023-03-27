package utils

import (
	"context"
	"fmt"
	"strconv"

	"github.com/labring/sealos/pkg/ssh"
	"golang.org/x/sync/errgroup"
)

func WaitSSHReady(ssh ssh.Interface, _ int, hosts ...string) error {
	eg, _ := errgroup.WithContext(context.Background())
	for i := range hosts {
		host := hosts[i]
		eg.Go(func() (err error) {
			timestamp, err := ssh.CmdToString(host, "date +%s", "")
			if err != nil {
				return fmt.Errorf("ssh is not ready")
			}
			_, err = strconv.Atoi(timestamp)
			if err != nil {
				return fmt.Errorf("ssh is not ready")
			}
			return nil
		})
	}
	return eg.Wait()
}
