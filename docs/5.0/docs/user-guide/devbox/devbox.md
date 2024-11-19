# Devbox

## Overview

To be continued..

## FAQ

### 1. Cursor connection problem but VSCode can connect

Cursor Since the plugin version synchronization with VSCode is slow, outdated versions may cause connection problems.

Solution: Manually install the Devbox plugin.

1. Download the vsix file of the [Devbox](https://marketplace.visualstudio.com/items?itemName=labring.devbox-aio) plugin
   from the VSCode plugin market.

![devbox-1](./images/1.png)

2. Open the Cursor's extension window.

3. Drag the downloaded file into the extension window.

![devbox-2](./images/2.png)

### 2. Cursor and VSCode cannot connect

First, understand the principle of the Devbox plugin: add remote environment information by modifying the ssh config
file, and connect to the remote environment through the Remote-SSH plugin. The plugin first writes the following line of
code in `~/.ssh/config` (some older versions may write other similar content):

```bash
Include ~/.ssh/sealos/devbox_config
```

This line of code imports the contents of the file `~/.ssh/sealos/devbox_config` into the current file. And
`devbox_config` contains normal SSH configuration content, for example:

```config
Host usw.sailos.io_ns-rqtny6y6_devbox1234
  HostName usw.sailos.io
  User devbox
  Port 40911
  IdentityFile ~/.ssh/sealos/usw.sailos.io_ns-rqtny6y6_devbox1234
  IdentitiesOnly yes
  StrictHostKeyChecking no
```

So if there is a problem, it is most likely a plugin bug that causes errors in reading and writing files. You can
feedback this to us or try to adjust the SSH file yourself.

### 3. Always stuck in downloading vscode-server or keep retrying

Cause: Due to some operation (such as restarting Devbox during this process), the download cursor is suspended, and
re-downloading causes conflicts.

Solution:

1. Enter the web terminal and delete the `.cursor-server` folder.
   1. Click "Terminal" in the operation button on the right side of the Devbox webpage list item.
   2. Enter the terminal and go to the user directory first, `cd ..`, then use `ls -a ` to view all files and you can
      see `.cursor-server`.
   3. Remove `rm -rf .cursor-server`.
   4. Just retry the connection.
2. If there is no content in the newly created Devbox, you can directly delete it and rebuild it.
