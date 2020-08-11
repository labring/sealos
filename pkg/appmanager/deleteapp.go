package appmanager

func DeleteApp(flag *InstallFlags) error {
	//TODO
	return nil
}

// return command run on every nodes and run only on master node
func NewDeleteCommands(cmds []Command) (Runner, Runner) {
	everyNodesCmd := &RunOnEveryNodes{}
	masterOnlyCmd := &RunOnMaster{}
	for _, c := range cmds {
		switch c.Name {
		case "REMOVE", "STOP":
			everyNodesCmd.Cmd = append(everyNodesCmd.Cmd, c)
		case "DELETE":
			masterOnlyCmd.Cmd = append(masterOnlyCmd.Cmd, c)
		default:
			// logger.Warn("Unknown command:%s,%s", c.Name, c.Cmd)
			// don't care other commands
		}
	}
	return everyNodesCmd, masterOnlyCmd
}
