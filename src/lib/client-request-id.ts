function getWebCrypto(): Crypto | undefined {
  if (typeof globalThis !== "object" || !("crypto" in globalThis)) {
    return undefined;
  }
  return (globalThis as { crypto?: Crypto }).crypto;
}

function formatUuidV4(bytes: Uint8Array): string {
  const hex = Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  return (
    `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-` +
    `${hex.slice(16, 20)}-${hex.slice(20, 32)}`
  );
}

function randomBytes(): Uint8Array {
  const bytes = new Uint8Array(16);
  const webCrypto = getWebCrypto();
  if (webCrypto && typeof webCrypto.getRandomValues === "function") {
    webCrypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  return bytes;
}

export function randomClientRequestId(): string {
  const webCrypto = getWebCrypto();
  if (webCrypto && typeof webCrypto.randomUUID === "function") {
    return webCrypto.randomUUID();
  }
  return formatUuidV4(randomBytes());
}
