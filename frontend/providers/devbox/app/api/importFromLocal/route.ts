import { NextRequest } from 'next/server';
import { PassThrough } from 'stream';
import { customAlphabet } from 'nanoid';

import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { devboxDB } from '@/services/db/init';
import { json2DevboxV2, json2Service, json2Ingress } from '@/utils/json2Yaml';
import { getRegionUid } from '@/utils/env';
import { generateDevboxRbacAndJob } from '@/utils/rbacJobGenerator';
import { parseTemplateConfig } from '@/utils/tools';
import { KubeFileSystem } from '@/utils/kubeFileSystem';
import { LocalImportRequestSchema, validateZipFile } from './schema';
import {
  waitForDevboxStatus,
  waitForDevboxReady,
  sleep,
  DEVBOX_IMPORT_CONSTANTS
} from '@/utils/devboxImportHelper';
import { KBDevboxTypeV2 } from '@/types/k8s';

export const dynamic = 'force-dynamic';

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz', 12);

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
  destPath: string = '/tmp/upload.zip'
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

async function unzipFileInDevbox(
  kubefs: KubeFileSystem,
  namespace: string,
  podName: string,
  containerName: string,
  zipPath: string = '/tmp/upload.zip',
  targetDir: string = '/home/devbox/project'
): Promise<void> {
  const command = `set -e
mkdir -p ${targetDir}

echo "Extracting zip file using Python..."
python3 << 'PYTHON_SCRIPT'
import zipfile
import os
import shutil

zip_path = "${zipPath}"
target_dir = "${targetDir}"

print(f"Extracting {zip_path} to {target_dir}")

with zipfile.ZipFile(zip_path, 'r') as zip_ref:
    for member in zip_ref.namelist():
        if '__MACOSX' in member or member.startswith('.'):
            continue

        member_path = os.path.join(target_dir, member)

        if member.endswith('/'):
            os.makedirs(member_path, exist_ok=True)
        else:
            os.makedirs(os.path.dirname(member_path), exist_ok=True)
            with zip_ref.open(member) as source, open(member_path, 'wb') as target:
                shutil.copyfileobj(source, target)

print("Extraction completed")

dirs_in_target = [d for d in os.listdir(target_dir) if os.path.isdir(os.path.join(target_dir, d))]
files_in_target = [f for f in os.listdir(target_dir) if os.path.isfile(os.path.join(target_dir, f))]

if len(dirs_in_target) == 1 and len(files_in_target) == 0:
    real_dir = os.path.join(target_dir, dirs_in_target[0])
    print(f"Moving contents from subdirectory {real_dir}...")

    for item in os.listdir(real_dir):
        src = os.path.join(real_dir, item)
        dst = os.path.join(target_dir, item)
        shutil.move(src, dst)

    os.rmdir(real_dir)
    print("Contents moved successfully")

os.remove(zip_path)
print("Zip file removed")
print("Listing extracted files:")
for item in os.listdir(target_dir):
    print(f"  {item}")
PYTHON_SCRIPT

echo "Unzip completed successfully"`;

  console.log('Executing unzip command in pod:', podName, 'container:', containerName);

  try {
    const result = await kubefs.execCommand(namespace, podName, containerName, [
      '/bin/sh',
      '-c',
      command
    ]);
    console.log(`File unzipped successfully to ${targetDir}`);
  } catch (error: any) {
    console.error('Unzip failed:', error?.message || String(error));
    throw new Error(`Failed to unzip file: ${error?.message || 'Unknown error'}`);
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const file = formData.get('file') as File;
    const name = formData.get('name') as string;
    const runtime = formData.get('runtime') as string;
    const templateUid = formData.get('templateUid') as string;
    const containerPort = parseInt(formData.get('containerPort') as string);
    const startupCommand = (formData.get('startupCommand') as string) || '';
    const cpu = parseInt(formData.get('cpu') as string);
    const memory = parseInt(formData.get('memory') as string);

    if (!file) {
      return jsonRes({
        code: 400,
        message: 'File is required'
      });
    }

    const validationResult = LocalImportRequestSchema.safeParse({
      name,
      runtime,
      templateUid,
      containerPort,
      startupCommand,
      cpu,
      memory
    });

    if (!validationResult.success) {
      return jsonRes({
        code: 400,
        message: 'Invalid request parameters',
        error: validationResult.error.errors
      });
    }

    if (!file.name.endsWith('.zip')) {
      return jsonRes({
        code: 400,
        message: 'Only .zip files are supported'
      });
    }

    if (file.size > DEVBOX_IMPORT_CONSTANTS.MAX_FILE_SIZE) {
      return jsonRes({
        code: 400,
        message: `File size exceeds limit (${DEVBOX_IMPORT_CONSTANTS.MAX_FILE_SIZE / 1024 / 1024}MB)`
      });
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());

    if (!validateZipFile(fileBuffer)) {
      return jsonRes({
        code: 400,
        message: 'Invalid ZIP file format'
      });
    }

    const headerList = req.headers;

    const { applyYamlList, k8sCustomObjects, namespace, k8sCore, k8sExec } = await getK8s({
      kubeconfig: await authSession(headerList)
    });

    const kubefs = new KubeFileSystem(k8sExec);

    const { body: devboxListBody } = (await k8sCustomObjects.listNamespacedCustomObject(
      'devbox.sealos.io',
      'v1alpha1',
      namespace,
      'devboxes'
    )) as {
      body: {
        items: KBDevboxTypeV2[];
      };
    };

    if (
      !!devboxListBody &&
      devboxListBody.items.length > 0 &&
      devboxListBody.items.find((item) => item.metadata.name === name)
    ) {
      return jsonRes({
        code: 409,
        message: 'Devbox already exists'
      });
    }

    const regionUid = getRegionUid();

    const template = await devboxDB.template.findFirst({
      where: {
        uid: templateUid,
        isDeleted: false,
        templateRepository: {
          isDeleted: false,
          regionUid,
          isPublic: true
        }
      },
      select: {
        templateRepository: {
          select: {
            uid: true,
            iconId: true,
            name: true,
            kind: true,
            description: true
          }
        },
        uid: true,
        image: true,
        name: true,
        config: true
      }
    });

    if (!template) {
      return jsonRes({
        code: 404,
        message: `Template not found`
      });
    }

    const { DEVBOX_AFFINITY_ENABLE, SQUASH_ENABLE, INGRESS_SECRET, SEALOS_DOMAIN } = process.env;

    const devboxData = {
      name,
      cpu,
      memory,
      templateConfig: template.config,
      image: template.image,
      templateUid: template.uid,
      networks: [
        {
          networkName: `${name}-${nanoid()}`,
          port: containerPort,
          portName: 'app-port',
          protocol: 'HTTP' as const,
          openPublicDomain: true,
          publicDomain: `${nanoid()}.${SEALOS_DOMAIN}`,
          customDomain: ''
        }
      ],
      env: []
    };

    // Create DevBox, Service and Ingress
    const devbox = json2DevboxV2(devboxData, DEVBOX_AFFINITY_ENABLE, SQUASH_ENABLE);
    const service = json2Service(devboxData);
    const ingress = json2Ingress(devboxData, INGRESS_SECRET as string);

    // Apply all resources
    try {
      await applyYamlList([devbox, service, ingress], 'create');
    } catch (ingressError: any) {
      if (ingressError.message?.includes('webhook') || ingressError.message?.includes('timeout')) {
        console.warn('Ingress creation failed, continuing without ingress:', ingressError.message);
        await applyYamlList([devbox, service], 'create');
      } else {
        throw ingressError;
      }
    }
    const devboxBody = await waitForDevboxStatus(k8sCustomObjects, namespace, name);

    const isReady = await waitForDevboxReady(
      k8sCustomObjects,
      k8sCore,
      namespace,
      name,
      DEVBOX_IMPORT_CONSTANTS.WAIT_FOR_READY_RETRIES,
      DEVBOX_IMPORT_CONSTANTS.WAIT_FOR_READY_INTERVAL
    );

    if (!isReady) {
      return jsonRes({
        code: 500,
        message: 'DevBox failed to become ready within timeout'
      });
    }

    const podsResponse = await k8sCore.listNamespacedPod(
      namespace,
      undefined,
      undefined,
      undefined,
      undefined,
      `app.kubernetes.io/name=${name}`
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
        console.error(`Upload attempt ${attempt} failed:`, error.message);
        if (attempt < 3) {
          console.log('Retrying in 3 seconds...');
          await sleep(3000);
        }
      }
    }

    if (!uploadSuccess) {
      throw lastError || new Error('Upload failed after 3 attempts');
    }

    console.log('Unzipping file...');
    try {
      await unzipFileInDevbox(kubefs, namespace, podName, containerName);
      console.log('File unzipped successfully');
    } catch (error: any) {
      console.error('Unzip failed:', error?.message || String(error));
      throw error;
    }

    const localImportCommand = `
set -e
cd /home/devbox/project
cat > /home/devbox/project/entrypoint.sh << 'ENTRYPOINT_EOF'
#!/bin/bash
set -e
cd /home/devbox/project
${startupCommand || 'echo "No startup command specified"'}
ENTRYPOINT_EOF
chmod +x /home/devbox/project/entrypoint.sh
echo "Local import completed successfully"
`.trim();

    const rbacJobYamls = generateDevboxRbacAndJob({
      devboxName: name,
      devboxNamespace: namespace,
      devboxUID: devboxBody.metadata.uid,
      execCommand: localImportCommand
    });

    await applyYamlList(rbacJobYamls, 'create');

    const response = await k8sCore.readNamespacedSecret(name, namespace);
    const base64PrivateKey = response.body.data?.['SEALOS_DEVBOX_PRIVATE_KEY'] as string;

    const config = parseTemplateConfig(template.config);
    const { user: userName, workingDir } = config;
    const { SEALOS_DOMAIN: domain } = process.env;

    return jsonRes({
      data: {
        devboxName: name,
        sshPort: devboxBody.status?.network?.nodePort,
        base64PrivateKey,
        userName,
        workingDir,
        domain,
        status: 'importing'
      }
    });
  } catch (err: any) {
    console.error('Local import error:', err);
    return jsonRes({
      code: 500,
      message: err?.message || 'Internal server error'
    });
  }
}
