import JSZip from 'jszip';
import { createTarPacker } from 'modern-tar';

export async function convertZipToTar(zipFile: File): Promise<File> {
  const zip = new JSZip();
  const zipData = await zip.loadAsync(zipFile);

  const { readable, controller } = createTarPacker();
  const chunks: Uint8Array[] = [];

  const reader = readable.getReader();

  const readStream = async () => {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
  };

  const readPromise = readStream();

  const files = Object.keys(zipData.files).sort();

  for (const fileName of files) {
    const file = zipData.files[fileName];

    if (file.dir) {
      continue;
    }

    const content = await file.async('uint8array');
    const fileDate = file.date || new Date();

    const fileStream = controller.add({
      name: fileName,
      size: content.length,
      mode: 0o644,
      mtime: fileDate,
      type: 'file'
    });

    const writer = fileStream.getWriter();
    await writer.write(content);
    await writer.close();
  }

  controller.finalize();
  await readPromise;

  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const tarBuffer = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    tarBuffer.set(chunk, offset);
    offset += chunk.length;
  }

  const tarBlob = new Blob([tarBuffer], { type: 'application/x-tar' });
  const tarFileName = zipFile.name.replace(/\.zip$/i, '.tar');

  return new File([tarBlob], tarFileName, { type: 'application/x-tar' });
}
