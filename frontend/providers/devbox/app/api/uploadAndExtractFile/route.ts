import { NextRequest } from 'next/server';
import { PassThrough } from 'stream';

import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { KubeFileSystem } from '@/utils/kubeFileSystem';
import { sleep, DEVBOX_IMPORT_CONSTANTS } from '@/utils/devboxImportHelper';

export const dynamic = 'force-dynamic';

async function testContainerReady(
  k8sExec: any,
  namespace: string,
  podName: string,
  containerName: string
): Promise<boolean> {
  return new Promise((resolve) => {
    const stdout = new PassThrough();
    const stderr = new PassThrough();

    const command = ['/bin/sh', '-c', 'echo "ready"'];

    k8sExec
      .exec(namespace, podName, containerName, command, stdout, stderr, null, false)
      .then((ws: any) => {
        let success = false;

        stdout.on('data', (data) => {
          if (data.toString().includes('ready')) {
            success = true;
          }
        });

        ws.on('close', () => {
          resolve(success);
        });

        ws.on('error', () => {
          resolve(false);
        });
      })
      .catch(() => {
        resolve(false);
      });
  });
}

async function uploadFileToDevbox(
  kubefs: KubeFileSystem,
  namespace: string,
  podName: string,
  containerName: string,
  fileBuffer: Buffer,
  destPath: string = '/tmp/upload.tar'
): Promise<void> {
  const pass = new PassThrough();

  const uploadPromise = kubefs.upload({
    namespace,
    podName,
    containerName,
    path: destPath,
    file: pass
  });

  pass.end(fileBuffer);

  await uploadPromise;
  console.log(`File uploaded successfully to ${destPath}`);
}

async function extractTarFileInDevbox(
  kubefs: KubeFileSystem,
  namespace: string,
  podName: string,
  containerName: string,
  tarPath: string = '/tmp/upload.tar',
  targetDir: string = '/home/devbox/project'
): Promise<string> {
  const command = `set -ex
echo "=========================================="
echo "Starting extract process..."
echo "=========================================="

echo "Step 1: Checking tar file..."
echo "Tar file path: ${tarPath}"
ls -lh ${tarPath}

echo ""
echo "Step 2: Creating temp directory..."
TEMP_DIR="/tmp/extract_temp_\$\$"
mkdir -p \$TEMP_DIR
echo "Temp directory created: \$TEMP_DIR"

echo ""
echo "Step 3: Extracting tar file to temp directory..."
tar -xf ${tarPath} -C \$TEMP_DIR
echo "Extraction completed"

echo ""
echo "Step 4: Removing __MACOSX if exists..."
rm -rf \$TEMP_DIR/__MACOSX
echo "__MACOSX removed if existed"

echo ""
echo "Step 5: Listing temp directory contents..."
echo "Contents of \$TEMP_DIR:"
ls -la \$TEMP_DIR

echo ""
echo "Step 6: Checking directory structure..."
cd \$TEMP_DIR
DIR_COUNT=\$(ls -d */ 2>/dev/null | wc -l)
FILE_COUNT=\$(ls -p 2>/dev/null | grep -v / | wc -l)

echo "Number of directories: \$DIR_COUNT"
echo "Number of files: \$FILE_COUNT"

if [ "\$DIR_COUNT" -eq 1 ] && [ "\$FILE_COUNT" -eq 0 ]; then
  SINGLE_DIR=\$(ls -d */ 2>/dev/null | head -n 1)
  echo "Found single root directory: \$SINGLE_DIR"
  EXTRACT_DIR="\$TEMP_DIR/\$SINGLE_DIR"
else
  echo "Multiple files/dirs at root, using temp dir as source"
  EXTRACT_DIR="\$TEMP_DIR"
fi

echo ""
echo "Step 7: Source directory info..."
echo "EXTRACT_DIR = \$EXTRACT_DIR"
echo "Contents of EXTRACT_DIR:"
ls -la "\$EXTRACT_DIR"

echo ""
echo "Step 8: Cleaning target directory contents..."
rm -rf ${targetDir}/*
rm -rf ${targetDir}/.[!.]*
echo "Target directory cleaned"

echo ""
echo "Step 9: Moving extracted files to target..."
if [ "\$EXTRACT_DIR" = "\$TEMP_DIR" ]; then
  mv \$TEMP_DIR/* ${targetDir}/ 2>/dev/null || true
  mv \$TEMP_DIR/.[!.]* ${targetDir}/ 2>/dev/null || true
else
  mv "\$EXTRACT_DIR"/* ${targetDir}/ 2>/dev/null || true
  mv "\$EXTRACT_DIR"/.[!.]* ${targetDir}/ 2>/dev/null || true
fi
echo "Move completed"

echo ""
echo "Step 10: Setting ownership..."
chown -R devbox:devbox ${targetDir}
echo "Ownership set to devbox:devbox"

echo ""
echo "Step 11: Verifying target directory..."
echo "Contents of ${targetDir}:"
ls -la ${targetDir}

echo ""
echo "Step 12: Cleaning up..."
rm -rf \$TEMP_DIR
rm -f ${tarPath}
echo "Temp directory and tar file removed"

echo ""
echo "=========================================="
echo "Extract completed successfully"
echo "=========================================="
`;

  console.log('Executing extract command in pod:', podName, 'container:', containerName);

  try {
    const result = await kubefs.execCommand(namespace, podName, containerName, [
      '/bin/sh',
      '-c',
      command
    ]);
    console.log('File extracted successfully to', targetDir, ', output:', result);
    return result;
  } catch (error: any) {
    console.error('Extract failed:', error?.message || String(error));
    throw new Error(`Failed to extract file: ${error?.message || 'Unknown error'}`);
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const file = formData.get('file') as File;
    const devboxName = formData.get('devboxName') as string;
    const startupCommand = (formData.get('startupCommand') as string) || '';

    if (!file) {
      return jsonRes({
        code: 400,
        message: 'File is required'
      });
    }

    if (!devboxName) {
      return jsonRes({
        code: 400,
        message: 'Devbox name is required'
      });
    }

    if (!file.name.endsWith('.tar')) {
      return jsonRes({
        code: 400,
        message: 'Only .tar files are supported'
      });
    }

    if (file.size > DEVBOX_IMPORT_CONSTANTS.MAX_FILE_SIZE) {
      return jsonRes({
        code: 400,
        message: `File size exceeds limit (${DEVBOX_IMPORT_CONSTANTS.MAX_FILE_SIZE / 1024 / 1024}MB)`
      });
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());

    const headerList = req.headers;

    const { namespace, k8sCore, k8sExec } = await getK8s({
      kubeconfig: await authSession(headerList)
    });

    const kubefs = new KubeFileSystem(k8sExec);

    const podsResponse = await k8sCore.listNamespacedPod(
      namespace,
      undefined,
      undefined,
      undefined,
      undefined,
      `app.kubernetes.io/name=${devboxName}`
    );

    const pods = podsResponse.body.items;
    if (!pods || pods.length === 0) {
      return jsonRes({
        code: 500,
        message: 'Pod not found'
      });
    }

    const podName = pods[0].metadata?.name;
    const containerName = pods[0].spec?.containers[0].name;

    if (!podName || !containerName) {
      return jsonRes({
        code: 500,
        message: 'Pod or container not found'
      });
    }

    console.log('Waiting for container to be fully ready for exec...');
    let containerReady = false;
    for (let i = 0; i < 20; i++) {
      const ready = await testContainerReady(k8sExec, namespace, podName, containerName);
      if (ready) {
        containerReady = true;
        console.log('Container is ready for exec');
        break;
      }
      console.log(`Container not ready yet, waiting... (${i + 1}/20)`);
      await sleep(2000);
    }

    if (!containerReady) {
      return jsonRes({
        code: 500,
        message: 'Container failed to become ready for exec within timeout'
      });
    }

    await sleep(2000);

    let uploadSuccess = false;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`Upload attempt ${attempt}/3`);
        await uploadFileToDevbox(kubefs, namespace, podName, containerName, fileBuffer);
        uploadSuccess = true;
        break;
      } catch (error: any) {
        lastError = error;
        console.error('Upload attempt', attempt, 'failed:', error.message);
        if (attempt < 3) {
          console.log('Retrying in 3 seconds...');
          await sleep(3000);
        }
      }
    }

    if (!uploadSuccess) {
      throw lastError || new Error('Upload failed after 3 attempts');
    }

    console.log('Extracting tar file...');
    try {
      const extractResult = await extractTarFileInDevbox(kubefs, namespace, podName, containerName);
      console.log('Tar file extracted successfully, result:', extractResult);
    } catch (error: any) {
      console.error('Extract failed:', error?.message || String(error));
      throw new Error(`Failed to extract file: ${error?.message || 'Unknown error'}`);
    }

    console.log('Creating entrypoint.sh...');
    const createEntrypointCommand = `
set -e
cd /home/devbox/project
cat > /home/devbox/project/entrypoint.sh << 'ENTRYPOINT_EOF'
#!/bin/bash
set -e
cd /home/devbox/project
${startupCommand || 'echo "No startup command specified"'}
ENTRYPOINT_EOF
chown devbox:devbox /home/devbox/project/entrypoint.sh
chmod +x /home/devbox/project/entrypoint.sh
echo "Local import completed successfully"
`.trim();

    try {
      await kubefs.execCommand(namespace, podName, containerName, [
        '/bin/sh',
        '-c',
        createEntrypointCommand
      ]);
      console.log('Entrypoint.sh created successfully');
    } catch (error: any) {
      console.error('Create entrypoint failed:', error?.message || String(error));
      throw new Error(`Failed to create entrypoint: ${error?.message || 'Unknown error'}`);
    }

    return jsonRes({
      data: {
        success: true
      }
    });
  } catch (err: any) {
    console.error('Upload and extract error:', err);
    return jsonRes({
      code: 500,
      message: err?.message || 'Internal server error'
    });
  }
}
