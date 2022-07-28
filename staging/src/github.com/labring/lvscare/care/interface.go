package care

import "github.com/spf13/pflag"

type flagRegisterer interface {
	RegisterFlags(*pflag.FlagSet)
}

type flagValidator interface {
	ValidateAndSetDefaults() error
}

type flagRequirer interface {
	RequiredFlags() []string
}

type stopper interface {
	Stop()
}

type Ruler interface {
	Setup() error
	Cleanup() error
}
