package proxy

import (
	"fmt"
	"io"
	"text/tabwriter"

	shimtypes "github.com/labring/image-cri-shim/pkg/types"
)

// PrintInfo renders the shim proxy configuration in a tabular format.
func PrintInfo(out io.Writer, cfg *shimtypes.Config) error {
	if cfg == nil {
		return fmt.Errorf("config is nil")
	}
	w := tabwriter.NewWriter(out, 2, 4, 2, ' ', 0)
	if _, err := fmt.Fprintf(w, "Hub\t%s\n", cfg.Address); err != nil {
		return err
	}
	if _, err := fmt.Fprintf(w, "Auth\t%s\n", cfg.Auth); err != nil {
		return err
	}
	if len(cfg.Registries) == 0 {
		if _, err := fmt.Fprintln(w, "Registries\t(空)"); err != nil {
			return err
		}
	} else {
		if _, err := fmt.Fprintln(w, "Registries"); err != nil {
			return err
		}
		if _, err := fmt.Fprintln(w, "地址\t认证信息"); err != nil {
			return err
		}
		for _, reg := range cfg.Registries {
			if _, err := fmt.Fprintf(w, "%s\t%s\n", reg.Address, reg.Auth); err != nil {
				return err
			}
		}
	}
	return w.Flush()
}
