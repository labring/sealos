# ENV module

This module will merge the host env and global env, then render env into cloudrootfs templates or set env when exec a shell command and script.

## ENV template render

ENV module only render the filename has ".tmpl" suffix, and render the result into a new file.

Like: test.yaml.tmpl -> test.yaml

test.yaml.tmpl:

```shell script
{{ .foo }}
```

render result, test.yaml:

```shell script
bar
```

## Shell ENV

Add ENV value to each shell command.

Raw shell command:

```shell script
cat /etc/hosts
```

WrapperShell:

```shell script
foo=bar cat /etc/hosts
```