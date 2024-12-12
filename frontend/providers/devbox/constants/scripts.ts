export const windowsScriptsTemplate = (
  privateKey: string,
  name: string,
  host: string,
  port: string,
  user: string
) => `
\$ConfigDirTxt = "\$HOME\\.ssh\\sealos\\"
\$ConfigDir = Resolve-Path \$ConfigDirTxt
\$SSHConfigFile = "\$HOME\\.ssh\\config"

\$ConfigFileTxt = "\${ConfigDirTxt}devbox_config"
\$ConfigFile = "\$ConfigDir\\devbox_config"

\$PrivateKey = @"
${privateKey}
"@

\$Name = "${name}"
\$Host = "${host}"
\$Port = "${port}"
\$User = "${user}"

\$IdentityFileTxt = "\${ConfigDirTxt}\$Name"
\$IdentityFile = "\$ConfigDir\$Name"
\$HostEntry = "Host \$Name\`n  HostName \$Host\`n  Port \$Port\`n  User \$User\`n  IdentityFile \$IdentityFileTxt\`n  IdentitiesOnly yes\`n  StrictHostKeyChecking no"

# Check if the configuration directory exists
if (-Not (Test-Path \$ConfigDir)) {
    New-Item -ItemType Directory -Path \$ConfigDir -Force | Out-Null
}

# Check if the configuration file exists
if (-Not (Test-Path \$ConfigFile)) {
    New-Item -ItemType File -Path \$ConfigFile -Force | Out-Null
}

# Check if the default config exists
if (-Not (Test-Path \$SSHConfigFile)) {
    New-Item -ItemType File -Path \$SSHConfigFile -Force | Out-Null
}

# Check if the .ssh/config file contains the Include statement
if (-Not (Get-Content \$SSHConfigFile)) {
    Add-Content -Path \$SSHConfigFile -Value "Include \$ConfigFileTxt\`n"
} else {
    if (-Not (Select-String -Path \$SSHConfigFile -Pattern "Include \$ConfigFileTxt")) {
        (Get-Content \$SSHConfigFile) | ForEach-Object {
            if (\$_ -eq (Get-Content \$SSHConfigFile)[0]) {
                "Include \$ConfigFileTxt\`n\$_"
            } else {
                \$_
            }
        } | Set-Content \$SSHConfigFile
    }
}

# Write the private key to the file
\$PrivateKey | Set-Content -Path \$IdentityFile -Force

# Check if a host with the same name exists
if (Select-String -Path \$ConfigFile -Pattern "^Host \$Name") {
    # Replace existing host entry
    (Get-Content \$ConfigFile) | ForEach-Object {
        if (\$_ -match "^Host \$Name") {
            \$HostEntry
        } elseif (\$_ -match "^Host ") {
            ""
        } else {
            \$_
        }
    } | Set-Content \$ConfigFile
} else {
    # Append to the end of the file
    Add-Content -Path \$ConfigFile -Value \$HostEntry
}
`
export const macosAndLinuxScriptsTemplate = (
  privateKey: string,
  name: string,
  host: string,
  port: string,
  user: string
) => `#!/bin/bash

CONFIG_DIR_TXT='~/.ssh/sealos/'
CONFIG_DIR="~/.ssh/sealos/"
SSH_CONFIG_FILE=~/.ssh/config

CONFIG_FILE_TXT=\${CONFIG_DIR_TXT}devbox_config
CONFIG_FILE=\${CONFIG_DIR}devbox_config

PRIVATE_KEY="${privateKey}"
NAME="${name}"
HOST="${host}"
PORT="${port}"
USER="${user}"

IDENTITY_FILE_TXT="\${CONFIG_DIR_TXT}\$NAME"
IDENTITY_FILE="\${CONFIG_DIR}\$NAME"
HOST_ENTRY="Host \$NAME\\n  HostName \$HOST\\n  Port \$PORT\\n  User \$USER\\n  IdentityFile \$IDENTITY_FILE_TXT\\n  IdentitiesOnly yes\\n  StrictHostKeyChecking no"

# 检查配置目录是否存在
mkdir -p \$CONFIG_DIR

# 检查配置文件是否存在
if [ ! -f "\$CONFIG_FILE" ]; then
    touch "\$CONFIG_FILE"
    chmod 0644 "\$CONFIG_FILE"
fi

# 检查默认的 config 是否 include 了
if [ ! -f "\$SSH_CONFIG_FILE" ]; then
    touch "\$SSH_CONFIG_FILE"
    chmod 0600 "\$SSH_CONFIG_FILE"
fi

# 检查 .ssh/config 文件中是否包含 Include 语句
if [ ! -s "\$SSH_CONFIG_FILE" ]; then
    # 如果文件为空，直接写入 Include 语句
    echo -e "Include \$CONFIG_FILE_TXT\\n" >> "\$SSH_CONFIG_FILE"
else
    # 如果文件不为空，检查是否包含 Include 语句
    if ! grep -q "Include \$CONFIG_FILE_TXT" "\$SSH_CONFIG_FILE"; then
        # 将 Include 语句添加到第一行
        sed -i "1i Include \$CONFIG_FILE_TXT" "\$SSH_CONFIG_FILE"
    fi
fi

# 写入私钥到文件
echo -e \$PRIVATE_KEY > \$IDENTITY_FILE
chmod 0600 \$IDENTITY_FILE

# 检查是否存在同名的 host
if grep -q "^Host \$NAME" "\$CONFIG_FILE"; then
    # 替换现有的 host 条目
    sed -i "/^Host \$NAME/,/^Host /{ /^Host \$NAME/!{ /^Host /!d; } }" "\$CONFIG_FILE"
    sed -i "/^Host \$NAME/c\\\$HOST_ENTRY" "\$CONFIG_FILE"
else
    # 追加到文件末尾
    echo -e "\$HOST_ENTRY" >> "\$CONFIG_FILE"
fi`
