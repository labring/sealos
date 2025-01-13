export const windowsScriptsTemplate = (
  privateKey: string,
  configHost: string,
  host: string,
  port: string,
  user: string
) => `\$ConfigDirTxt = "~/.ssh/sealos/"
\$ConfigDir = "\$HOME\\.ssh\\sealos\\"
\$SSHConfigFile = "\$HOME\\.ssh\\config"

\$ConfigFileTxt = "~/.ssh/sealos/devbox_config"
\$ConfigFile = "\$ConfigDir\\devbox_config"

\$PrivateKey = @"
${privateKey}
"@

\$Name = "${configHost}"
\$HostName = "${host}"
\$Port = "${port}"
\$User = "${user}"

\$IdentityFileTxt = "\${ConfigDirTxt}\$Name"
\$IdentityFile = "\$ConfigDir\$Name"
\$HostEntry = "Host \$Name\`n  HostName \$HostName\`n  Port \$Port\`n  User \$User\`n  IdentityFile \$IdentityFileTxt\`n  IdentitiesOnly yes\`n  StrictHostKeyChecking no"

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
    $newContent = @()
    $skip = $false

    (Get-Content $ConfigFile) | ForEach-Object {
        if ($_ -match "^Host $Name$") {
            $skip = $true
            $newContent += $HostEntry
        }
        elseif ($_ -match "^Host ") {
            $skip = $false
            $newContent += $_
        }
        elseif (-not $skip) {
            $newContent += $_
        }
    }

    $newContent | Set-Content $ConfigFile
} else {
    # Append to the end of the file
    Add-Content -Path \$ConfigFile -Value \$HostEntry
}
`;
export const macosAndLinuxScriptsTemplate = (
  privateKey: string,
  configHost: string,
  host: string,
  port: string,
  user: string
) => `#!/bin/bash

CONFIG_DIR_TXT="~/.ssh/sealos/"
CONFIG_DIR=~/.ssh/sealos/
SSH_CONFIG_FILE=~/.ssh/config

CONFIG_FILE_TXT="\${CONFIG_DIR_TXT}devbox_config"
CONFIG_FILE=\${CONFIG_DIR}devbox_config

PRIVATE_KEY="${privateKey}"
NAME="${configHost}"
HOST="${host}"
PORT="${port}"
USER="${user}"

IDENTITY_FILE_TXT="\${CONFIG_DIR_TXT}\$NAME"
IDENTITY_FILE="\${CONFIG_DIR}\$NAME"
HOST_ENTRY="
Host \$NAME
  HostName \$HOST
  Port \$PORT
  User \$USER
  IdentityFile \$IDENTITY_FILE_TXT
  IdentitiesOnly yes
  StrictHostKeyChecking no"

mkdir -p \$CONFIG_DIR

if [ ! -f "\$CONFIG_FILE" ]; then
    touch "\$CONFIG_FILE"
    chmod 0644 "\$CONFIG_FILE"
fi

if [ ! -f "\$SSH_CONFIG_FILE" ]; then
    touch "\$SSH_CONFIG_FILE"
    chmod 0600 "\$SSH_CONFIG_FILE"
fi

if [ ! -s "\$SSH_CONFIG_FILE" ]; then
    echo "Include \$CONFIG_FILE_TXT\\n" >> "\$SSH_CONFIG_FILE"
else
    if ! grep -q "Include \$CONFIG_FILE_TXT" "\$SSH_CONFIG_FILE"; then
        temp_file="\$(mktemp)"
        echo "Include \$CONFIG_FILE_TXT" > "\$temp_file"
        cat "\$SSH_CONFIG_FILE" >> "\$temp_file"
        mv "\$temp_file" "\$SSH_CONFIG_FILE"
    fi
fi

echo "$PRIVATE_KEY" > "$IDENTITY_FILE"
chmod 0600 "$IDENTITY_FILE"

if grep -q "^Host \$NAME" "\$CONFIG_FILE"; then
    temp_file="\$(mktemp)"
    awk '
        BEGIN { skip=0 }
        /^Host '"$NAME"'$/ { skip=1; next }
        /^Host / {
            skip=0
            print
            next
        }
        /^$/ {
            skip=0
            print
            next
        }
        !skip { print }
    ' "$CONFIG_FILE" > "$temp_file"
    echo "\$HOST_ENTRY" >> "$temp_file"
    mv "$temp_file" "$CONFIG_FILE"
else
    echo "\$HOST_ENTRY" >> "\$CONFIG_FILE"
fi`;

export const sshConfig = (
  configHost: string,
  host: string,
  port: string,
  user: string
) => `Host ${configHost}
  HostName ${host}
  Port ${port}
  User ${user}
  IdentityFile ~/.ssh/sealos/${configHost}
  IdentitiesOnly yes
  StrictHostKeyChecking no
`;

export const sshConnectCommand = (configHost: string) => `ssh ${configHost}
`;
