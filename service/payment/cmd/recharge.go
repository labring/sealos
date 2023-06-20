/*
Copyright © 2022 NAME HERE <EMAIL ADDRESS>
*/
package cmd

import (
	"fmt"
	"payment/api"

	"github.com/spf13/cobra"
)

type Config struct {
	User   string
	Amount int64
}

var config *Config

// rechargeCmd represents the recharge command
var rechargeCmd = &cobra.Command{
	Use:   "recharge",
	Short: "using wechat pay to recharge on command line",
	Long: `payment recharge --user fanux --amount 100

This command will output QRcode on your terminal, Just scan and pay it.
`,
	RunE: func(cmd *cobra.Command, args []string) error {
		fmt.Printf("Use WeChat to scan the QR code below to recharge, please make sure the username and amount are correct\n")
		fmt.Printf("User: %s\n", config.User)
		fmt.Printf("Amount: %d\n", config.Amount)

		return api.QRTerminalPay(config.User, config.Amount*100, "")
	},
}

func init() {
	config = &Config{}
	rootCmd.AddCommand(rechargeCmd)

	// Here you will define your flags and configuration settings.

	// Cobra supports Persistent Flags which will work for this command
	// and all subcommands, e.g.:
	rechargeCmd.PersistentFlags().StringVar(&config.User, "user", "fanux", "recharge for a sealos cloud user")
	rechargeCmd.PersistentFlags().Int64Var(&config.Amount, "amount", 1, "recharge amount")

	// Cobra supports local flags which will only run when this command
	// is called directly, e.g.:
	// rechargeCmd.Flags().BoolP("toggle", "t", false, "Help message for toggle")
}
