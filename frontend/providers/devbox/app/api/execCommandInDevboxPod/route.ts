import { NextRequest } from 'next/server'
import { PassThrough, Readable, Writable } from 'stream'

import { authSession } from '@/services/backend/auth'
import { getK8s } from '@/services/backend/kubernetes'
import { jsonRes } from '@/services/backend/response'

export const dynamic = 'force-dynamic'

async function execCommand(
  k8sExec: any,
  namespace: string,
  podName: string,
  containerName: string,
  command: string[],
  stdin: Readable | null = null,
  stdout: Writable | null = null,
  stderr: Writable | null = null
) {
  return new Promise<string>(async (resolve, reject) => {
    let chunks = Buffer.alloc(0)

    if (!stdout) {
      stdout = new PassThrough()
    }

    const free = () => {
      stderr?.removeAllListeners()
      stdout?.removeAllListeners()
      stdin?.removeAllListeners()
    }

    stdout.on('end', () => {
      free()
      resolve(chunks.toString())
    })

    stdout.on('error', (error) => {
      free()
      reject(error)
    })

    if (!stderr) {
      stderr = new PassThrough()
    }

    stderr.on('data', (chunk) => {
      stdout?.write(chunk)
    })

    const WebSocket = await k8sExec.exec(
      namespace,
      podName,
      containerName,
      command,
      stdout,
      stderr,
      stdin,
      false
    )

    WebSocket.on('close', () => {
      resolve('success upload, close web socket')
    })

    if (stdin) {
      stdin.on('end', () => {
        free()
      })
    }
  })
}

export async function POST(req: NextRequest) {
  try {
    const { devboxName, command } = (await req.json()) as {
      devboxName: string
      command: string
    }

    const headerList = req.headers

    const { namespace, k8sCore, k8sExec } = await getK8s({
      kubeconfig: await authSession(headerList)
    })

    // get pods
    const {
      body: { items: pods }
    } = await k8sCore.listNamespacedPod(
      namespace,
      undefined,
      undefined,
      undefined,
      undefined,
      `app.kubernetes.io/name=${devboxName}`
    )

    const podName = pods[0].metadata?.name
    const containerName = pods[0].spec?.containers[0].name

    if (!podName || !containerName) {
      return jsonRes({
        code: 500,
        error: 'Pod or container not found'
      })
    }

    const processStream = new PassThrough()
    const { readable, writable } = new TransformStream()
    const writer = writable.getWriter()

    const execPromise = execCommand(
      k8sExec,
      namespace,
      podName,
      containerName,
      ['/bin/sh', '-c', command],
      null,
      processStream,
      null
    )

    processStream.on('data', (chunk) => writer.write(chunk))
    processStream.on('end', () => writer.close())
    processStream.on('error', async (error) => {
      console.error('Process stream error:', error)
      await writer.close()
    })

    execPromise.finally(async () => {
      processStream.end()
    })

    req.signal.addEventListener('abort', async () => {
      console.log('Connection aborted by client')
      processStream.destroy()
      await writer.close()
      execCommand(k8sExec, namespace, podName, containerName, [
        '/bin/sh',
        '-c',
        'rm -rf /home/devbox/.cache/JetBrains'
      ])
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream;charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'X-Accel-Buffering': 'no',
        'Cache-Control': 'no-cache, no-transform'
      }
    })
  } catch (err: any) {
    return jsonRes({
      code: 500,
      error: err
    })
  }
}
