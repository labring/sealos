package commands

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/spf13/cobra"

	shimtypes "github.com/labring/image-cri-shim/pkg/types"
	kubernetesclient "github.com/labring/sealos/pkg/client-go/kubernetes"
	"github.com/labring/sealos/pkg/registry/proxy"
)

type proxyManagerFactory struct{}

func (proxyManagerFactory) manager(ctx context.Context) (*proxy.Manager, error) {
	cli, err := kubernetesclient.NewKubernetesClient("", "")
	if err != nil {
		return nil, err
	}
	return proxy.NewManager(cli.Kubernetes()), nil
}

// NewRegistryProxyCmd constructs the "sealos registry proxy" command group.
func NewRegistryProxyCmd() *cobra.Command {
	factory := proxyManagerFactory{}

	cmd := &cobra.Command{
		Use:   "proxy",
		Short: "管理 image-cri-shim 注册表代理",
	}

	cmd.AddCommand(newProxyUpgradeCmd(factory))
	cmd.AddCommand(newProxyInfoCmd(factory))
	cmd.AddCommand(newProxyAddCmd(factory))
	cmd.AddCommand(newProxyDeleteCmd(factory))
	return cmd
}

func translateError(err error) error {
	if err == nil {
		return nil
	}
	switch {
	case errors.Is(err, proxy.ErrNotInitialized):
		return fmt.Errorf("未检测到 kube-system/%s 配置，请先执行 sealos registry proxy init", proxy.ConfigMapName)
	case errors.Is(err, proxy.ErrConfigDataMissing):
		return fmt.Errorf("kube-system/%s 中缺少代理配置内容，请重新执行 sealos registry proxy init", proxy.ConfigMapName)
	case errors.Is(err, proxy.ErrInvalidConfig):
		return fmt.Errorf("kube-system/%s 中的配置无法解析，请检查 YAML 内容", proxy.ConfigMapName)
	case errors.Is(err, proxy.ErrInvalidRegistryAddress):
		return fmt.Errorf("代理地址不能为空")
	case errors.Is(err, proxy.ErrRegistryNotFound):
		return fmt.Errorf("未找到对应的代理配置")
	case errors.Is(err, proxy.ErrDaemonSetNotFound):
		return fmt.Errorf("未找到 image-cri-shim DaemonSet，请先执行 sealos registry proxy init")
	case errors.Is(err, proxy.ErrDaemonSetInvalidContainer):
		return fmt.Errorf("image-cri-shim DaemonSet 模板缺少容器，无法升级")
	default:
		return err
	}
}

func newProxyUpgradeCmd(factory proxyManagerFactory) *cobra.Command {
	return &cobra.Command{
		Use:   "upgrade <版本号>",
		Short: "升级 image-cri-shim 版本",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			version := strings.TrimSpace(args[0])
			if version == "" {
				return fmt.Errorf("版本号不能为空")
			}
			mgr, err := factory.manager(cmd.Context())
			if err != nil {
				return err
			}
			if err := mgr.Upgrade(cmd.Context(), version); err != nil {
				return translateError(err)
			}
			fmt.Fprintf(cmd.OutOrStdout(), "已将 image-cri-shim 升级至 %s\n", version)
			return nil
		},
	}
}

func newProxyInfoCmd(factory proxyManagerFactory) *cobra.Command {
	return &cobra.Command{
		Use:   "info",
		Short: "查看当前注册表代理配置",
		RunE: func(cmd *cobra.Command, args []string) error {
			mgr, err := factory.manager(cmd.Context())
			if err != nil {
				return err
			}
			cfg, err := mgr.GetConfig(cmd.Context())
			if err != nil {
				return translateError(err)
			}
			return proxy.PrintInfo(cmd.OutOrStdout(), cfg)
		},
	}
}

type addOptions struct {
	address string
	auth    string
}

func newProxyAddCmd(factory proxyManagerFactory) *cobra.Command {
	addOpts := &addOptions{}
	cmd := &cobra.Command{
		Use:   "add",
		Short: "添加注册表代理配置",
		RunE: func(cmd *cobra.Command, args []string) error {
			if strings.TrimSpace(addOpts.address) == "" {
				return fmt.Errorf("必须通过 --address 指定代理地址")
			}
			mgr, err := factory.manager(cmd.Context())
			if err != nil {
				return err
			}
			err = mgr.AddOrUpdateRegistry(cmd.Context(), proxyRegistryFromFlags(addOpts))
			if err != nil {
				return translateError(err)
			}
			fmt.Fprintf(cmd.OutOrStdout(), "已添加/更新代理 %s\n", addOpts.address)
			return nil
		},
	}
	cmd.Flags().StringVar(&addOpts.address, "address", "", "代理地址，例如 https://registry.mirror.local")
	cmd.Flags().StringVar(&addOpts.auth, "auth", "", "可选的认证信息，格式为 user:password")
	cmd.Flags().SortFlags = false
	return cmd
}

type deleteOptions struct {
	address string
}

func newProxyDeleteCmd(factory proxyManagerFactory) *cobra.Command {
	delOpts := &deleteOptions{}
	cmd := &cobra.Command{
		Use:   "delete",
		Short: "删除注册表代理配置",
		RunE: func(cmd *cobra.Command, args []string) error {
			if strings.TrimSpace(delOpts.address) == "" {
				return fmt.Errorf("必须通过 --address 指定需要删除的代理地址")
			}
			mgr, err := factory.manager(cmd.Context())
			if err != nil {
				return err
			}
			if err := mgr.DeleteRegistry(cmd.Context(), delOpts.address); err != nil {
				if errors.Is(err, proxy.ErrRegistryNotFound) {
					return fmt.Errorf("未找到地址为 %s 的代理配置", delOpts.address)
				}
				return translateError(err)
			}
			fmt.Fprintf(cmd.OutOrStdout(), "已删除代理 %s\n", delOpts.address)
			return nil
		},
	}
	cmd.Flags().StringVar(&delOpts.address, "address", "", "需要删除的代理地址")
	cmd.Flags().SortFlags = false
	return cmd
}

func proxyRegistryFromFlags(opts *addOptions) shimtypes.Registry {
	return shimtypes.Registry{
		Address: opts.address,
		Auth:    opts.auth,
	}
}
