export interface GitImportCommandOptions {
  gitUrl: string;
  isPrivate: boolean;
  token?: string;
  startupCommand?: string;
}

export interface LocalImportCommandOptions {
  startupCommand?: string;
}

function escapeShellArg(arg: string): string {
  return `'${arg.replace(/'/g, "'\\''")}'`;
}

export function generateGitImportCommand(options: GitImportCommandOptions): string {
  const {
    gitUrl,
    isPrivate,
    token,
    startupCommand = 'echo "No startup command specified"'
  } = options;

  const escapedGitUrl = escapeShellArg(gitUrl);
  const escapedStartupCommand = startupCommand.replace(/'/g, "'\\''");

  if (isPrivate && token) {
    const escapedToken = token.replace(/'/g, "'\\''");

    let authenticatedUrl = gitUrl;
    try {
      const urlObj = new URL(gitUrl);
      urlObj.username = 'oauth2';
      urlObj.password = escapedToken;
      authenticatedUrl = urlObj.toString();
    } catch (error) {
      console.error('Failed to parse Git URL:', error);
    }

    const escapedAuthUrl = escapeShellArg(authenticatedUrl);

    return `
set -e
echo "Starting git import..."
rm -rf /home/devbox/project/*
rm -rf /home/devbox/project/.[!.]*

git clone --progress --depth 1 ${escapedAuthUrl} /home/devbox/project/temp_repo 2>&1

echo "Moving repository contents..."
mv /home/devbox/project/temp_repo/* /home/devbox/project/ 2>/dev/null || true
mv /home/devbox/project/temp_repo/.[!.]* /home/devbox/project/ 2>/dev/null || true
rm -rf /home/devbox/project/temp_repo
echo "Creating entrypoint.sh..."
cat > /home/devbox/project/entrypoint.sh << 'ENTRYPOINT_EOF'
#!/bin/bash
set -e
cd /home/devbox/project
${escapedStartupCommand}
ENTRYPOINT_EOF
chmod +x /home/devbox/project/entrypoint.sh
echo "Git import completed successfully"
`.trim();
  }

  return `
set -e
echo "Starting git import..."
rm -rf /home/devbox/project/*
rm -rf /home/devbox/project/.[!.]*
git clone --progress --depth 1 ${escapedGitUrl} /home/devbox/project/temp_repo 2>&1
echo "Moving repository contents..."
mv /home/devbox/project/temp_repo/* /home/devbox/project/ 2>/dev/null || true
mv /home/devbox/project/temp_repo/.[!.]* /home/devbox/project/ 2>/dev/null || true
rm -rf /home/devbox/project/temp_repo
echo "Creating entrypoint.sh..."
cat > /home/devbox/project/entrypoint.sh << 'ENTRYPOINT_EOF'
#!/bin/bash
set -e
cd /home/devbox/project
${escapedStartupCommand}
ENTRYPOINT_EOF
chmod +x /home/devbox/project/entrypoint.sh
echo "Git import completed successfully"
`.trim();
}

export function generateLocalImportCommand(options: LocalImportCommandOptions): string {
  const { startupCommand = 'echo "No startup command specified"' } = options;

  return `
set -e
cd /home/devbox/project
cat > /home/devbox/project/entrypoint.sh << 'ENTRYPOINT_EOF'
#!/bin/bash
set -e
cd /home/devbox/project
${startupCommand}
ENTRYPOINT_EOF
chmod +x /home/devbox/project/entrypoint.sh
echo "Local import completed successfully"
`.trim();
}
