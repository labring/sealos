package cmd

import (
	"bytes"
	"fmt"
	"io"
	"os"

	"github.com/spf13/cobra"

	"github.com/fanux/sealos/pkg/logger"
)

const defaultCopyRight = `
# Copyright © 2020 sealos.

# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
# 
#     http://www.apache.org/licenses/LICENSE-2.0
# 
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
`

var (
	completionShells = map[string]func(out io.Writer, boilerPlate string, cmd *cobra.Command) error{
		"bash": runCompletionBash,
		"zsh":  runCompletionZsh,
	}
	completionExample = `
	# Installing bash completion on macOS using homebrew
		## If running Bash 3.2 included with macOS
		    brew install bash-completion
		## or, if running Bash 4.1+
		    brew install bash-completion@2
		## If you've installed via other means, you may need add the completion to your completion directory
		    sealos completion bash > $(brew --prefix)/etc/bash_completion.d/sealos

	# Load the sealos completion code for zsh[1] into the current shell
		    source <(sealos completion zsh)
	# Set the sealos completion code for zsh[1] to autoload on startup
		    sealos completion zsh > "${fpath[1]}/_sealos"

	# Installing bash completion on Linux
		## If bash-completion is not installed on Linux, please install the 'bash-completion' package
		## via your distribution's package manager.
		## Load the sealos completion code for bash into the current shell
		    source <(sealos completion bash)
		## Write bash completion code to a file and source if from .bash_profile
		    sealos completion bash > ~/.sealos/completion.bash.inc
		    printf "
		      # sealos shell completion
			  source '$HOME/.sealos/completion.bash.inc'
		      " >> $HOME/.bash_profile
		      source $HOME/.bash_profile
`
)

func init() {
	rootCmd.AddCommand(NewCmdCompletion(os.Stdout, ""))
}

func NewCmdCompletion(out io.Writer, boilerPlate string) *cobra.Command {
	var shells []string
	for s := range completionShells {
		shells = append(shells, s)
	}

	cmd := &cobra.Command{
		Use:                   "completion bash",
		DisableFlagsInUseLine: true,
		Short:                 "Output shell completion code for the specified shell (bash or zsh)",
		Example:               completionExample,
		Run: func(cmd *cobra.Command, args []string) {
			err := RunCompletion(out, boilerPlate, cmd, args)
			if err != nil {
				logger.Error(err)
				return
			}
		},
		ValidArgs: shells,
	}
	return cmd
}

func RunCompletion(out io.Writer, copyRight string, cmd *cobra.Command, args []string) error {
	if len(args) == 0 {
		return fmt.Errorf("shell not specified")
	}
	if len(args) > 1 {
		return fmt.Errorf("too many arguments, expected only the shell type")
	}
	run, found := completionShells[args[0]]
	if !found {
		return fmt.Errorf("unsupported shell type %q", args[0])
	}

	return run(out, copyRight, cmd.Parent())
}

func runCompletionBash(out io.Writer, copyRight string, sealos *cobra.Command) error {
	if len(copyRight) == 0 {
		copyRight = defaultCopyRight
	}
	if _, err := out.Write([]byte(copyRight)); err != nil {
		return err
	}

	return sealos.GenBashCompletion(out)
}

func runCompletionZsh(out io.Writer, copyRight string, sealos *cobra.Command) error {
	zshHead := "#compdef sealos\n"

	_, _ = out.Write([]byte(zshHead))

	if len(copyRight) == 0 {
		copyRight = defaultCopyRight
	}
	if _, err := out.Write([]byte(copyRight)); err != nil {
		return err
	}

	zshInitialization := `
__sealos_bash_source() {
	alias shopt=':'
	emulate -L sh
	setopt kshglob noshglob braceexpand
	source "$@"
}
__sealos_type() {
	# -t is not supported by zsh
	if [ "$1" == "-t" ]; then
		shift
		# fake Bash 4 to disable "complete -o nospace". Instead
		# "compopt +-o nospace" is used in the code to toggle trailing
		# spaces. We don't support that, but leave trailing spaces on
		# all the time
		if [ "$1" = "__sealos_compopt" ]; then
			echo builtin
			return 0
		fi
	fi
	type "$@"
}
__sealos_compgen() {
	local completions w
	completions=( $(compgen "$@") ) || return $?
	# filter by given word as prefix
	while [[ "$1" = -* && "$1" != -- ]]; do
		shift
		shift
	done
	if [[ "$1" == -- ]]; then
		shift
	fi
	for w in "${completions[@]}"; do
		if [[ "${w}" = "$1"* ]]; then
			echo "${w}"
		fi
	done
}
__sealos_compopt() {
	true # don't do anything. Not supported by bashcompinit in zsh
}
__sealos_ltrim_colon_completions()
{
	if [[ "$1" == *:* && "$COMP_WORDBREAKS" == *:* ]]; then
		# Remove colon-word prefix from COMPREPLY items
		local colon_word=${1%${1##*:}}
		local i=${#COMPREPLY[*]}
		while [[ $((--i)) -ge 0 ]]; do
			COMPREPLY[$i]=${COMPREPLY[$i]#"$colon_word"}
		done
	fi
}
__sealos_get_comp_words_by_ref() {
	cur="${COMP_WORDS[COMP_CWORD]}"
	prev="${COMP_WORDS[${COMP_CWORD}-1]}"
	words=("${COMP_WORDS[@]}")
	cword=("${COMP_CWORD[@]}")
}
__sealos_filedir() {
	# Don't need to do anything here.
	# Otherwise we will get trailing space without "compopt -o nospace"
	true
}
autoload -U +X bashcompinit && bashcompinit
# use word boundary patterns for BSD or GNU sed
LWORD='[[:<:]]'
RWORD='[[:>:]]'
if sed --help 2>&1 | grep -q 'GNU\|BusyBox'; then
	LWORD='\<'
	RWORD='\>'
fi
__sealos_convert_bash_to_zsh() {
	sed \
	-e 's/declare -F/whence -w/' \
	-e 's/_get_comp_words_by_ref "\$@"/_get_comp_words_by_ref "\$*"/' \
	-e 's/local \([a-zA-Z0-9_]*\)=/local \1; \1=/' \
	-e 's/flags+=("\(--.*\)=")/flags+=("\1"); two_word_flags+=("\1")/' \
	-e 's/must_have_one_flag+=("\(--.*\)=")/must_have_one_flag+=("\1")/' \
	-e "s/${LWORD}_filedir${RWORD}/__sealos_filedir/g" \
	-e "s/${LWORD}_get_comp_words_by_ref${RWORD}/__sealos_get_comp_words_by_ref/g" \
	-e "s/${LWORD}__ltrim_colon_completions${RWORD}/__sealos_ltrim_colon_completions/g" \
	-e "s/${LWORD}compgen${RWORD}/__sealos_compgen/g" \
	-e "s/${LWORD}compopt${RWORD}/__sealos_compopt/g" \
	-e "s/${LWORD}declare${RWORD}/builtin declare/g" \
	-e "s/\\\$(type${RWORD}/\$(__sealos_type/g" \
	<<'BASH_COMPLETION_EOF'
`
	_, _ = out.Write([]byte(zshInitialization))

	buf := new(bytes.Buffer)
	_ = sealos.GenBashCompletion(buf)
	_, _ = out.Write(buf.Bytes())

	zshTail := `
BASH_COMPLETION_EOF
}
__sealos_bash_source <(__sealos_convert_bash_to_zsh)
`
	_, _ = out.Write([]byte(zshTail))
	return nil
}
