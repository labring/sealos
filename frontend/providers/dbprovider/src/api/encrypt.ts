export async function encryptCbcBrowser(plainText: string, key: string): Promise<string> {
  if (key.length !== 32) {
    throw new Error('Key must be exactly 32 characters (256 bits)');
  }

  const enc = new TextEncoder();
  const keyData = enc.encode(key);
  const iv = crypto.getRandomValues(new Uint8Array(16));

  const cryptoKey = await crypto.subtle.importKey('raw', keyData, { name: 'AES-CBC' }, false, [
    'encrypt'
  ]);

  const encrypted = await crypto.subtle.encrypt(
    {
      name: 'AES-CBC',
      iv: iv
    },
    cryptoKey,
    enc.encode(plainText)
  );

  const result = new Uint8Array(iv.length + encrypted.byteLength);
  result.set(iv);
  result.set(new Uint8Array(encrypted), iv.length);

  return btoa(String.fromCharCode(...result));
}
