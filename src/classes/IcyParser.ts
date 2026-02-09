import { concat, parseMetadata } from "../utils/helpers"

/**
 * Metadata returned from an ICY stream.
 */
export interface IcyMetadata {
  /** The raw metadata string from the stream */
  raw: string
  /** The current stream title (e.g., "Artist - Song") */
  title: string | undefined
  /** The station name from the `icy-name` header */
  name: string | undefined
  /** The station genre from the `icy-genre` header */
  genre: string | undefined
  /** The station URL from the `icy-url` header */
  url: string | undefined
  /** The stream bitrate in kbps from the `icy-br` header */
  bitrate: number
  /** The content type of the stream (e.g., "audio/mpeg") */
  contentType: string | undefined
  /** The server software from the `server` header */
  server: string | undefined
}

/**
 * Parser for ICY (SHOUTcast/Icecast) stream metadata.
 *
 * ICY streams embed metadata (like the current song title) inline within the audio data.
 * This class handles connecting to a stream and extracting that metadata.
 *
 * @example
 * ```typescript
 * const parser = new IcyParser("https://radio.cloudradio.cz/listen/crc/radio.mp3");
 * try {
 *   const metadata = await parser.parseOnce();
 *   console.log(`Now playing: ${metadata.title}`);
 * } catch (error) {
 *   console.error("Failed to parse metadata:", error);
 * }
 * ```
 */
export class IcyParser {
  private readonly url: string

  /**
   * Creates a new ICY stream parser.
   *
   * @param url - The URL of the ICY stream to parse
   */
  constructor(url: string) {
    this.url = url
  }

  /**
   * Connects to the stream and parses the first available metadata block.
   *
   * This method opens a connection to the stream, reads until it reaches the
   * first metadata block, extracts the metadata, and then closes the connection.
   *
   * @returns A promise that resolves to the parsed metadata
   *
   * @throws {Error} "Stream does not support ICY metadata" - if the stream doesn't have the `icy-metaint` header
   * @throws {Error} "Stream ended before metadata was received" - if the stream closes before metadata is found
   * @throws {Error} "Failed to read metadata from stream" - if the metadata chunk couldn't be read
   *
   * @example
   * ```typescript
   * const parser = new IcyParser("https://stream.example.com/radio.mp3");
   * const { title, name, bitrate } = await parser.parseOnce();
   * console.log(`Station: ${name}, Bitrate: ${bitrate}kbps, Playing: ${title}`);
   * ```
   */
  public async parseOnce(): Promise<IcyMetadata> {
  const controller = new AbortController()

  const res = await fetch(this.url, {
    headers: { "Icy-MetaData": "1" },
    signal: controller.signal
  })

  const metaint = Number(res.headers.get("icy-metaint"))
  if (!metaint) throw new Error("Stream does not support ICY metadata")

  const reader = res.body!.getReader()

  let received = 0
  let leftover = new Uint8Array(0)

  try {
    while (received < metaint) {
      const { value, done } = await reader.read()
      if (done || !value) throw new Error("Stream ended before metadata was received")

      received += value.length
      leftover = value
    }

    const overflow = received - metaint

    let metaStart: Uint8Array

    if (overflow > 0) {
      metaStart = leftover.slice(leftover.length - overflow)
    } else {
      const { value } = await reader.read()
      if (!value) throw new Error("Failed to read metadata from stream")
      metaStart = value
    }

    const lengthByte = metaStart[0]
    const metadataLength = lengthByte! * 16

    let metadata = metaStart.slice(1)

    while (metadata.length < metadataLength) {
      const { value } = await reader.read()
      if (!value) break
      metadata = concat(metadata, value)
    }

    const raw = new TextDecoder()
      .decode(metadata.slice(0, metadataLength))
      .replace(/\0+$/, "")

    return {
      ...parseMetadata(raw),
      raw,
      name: res.headers.get("icy-name") ?? undefined,
      genre: res.headers.get("icy-genre") ?? undefined,
      url: res.headers.get("icy-url") ?? undefined,
      bitrate: Number(res.headers.get("icy-br")) ?? 0,
      contentType: res.headers.get("content-type") ?? undefined,
      server: res.headers.get("server") ?? undefined,
    }
  } finally {
    controller.abort()
    reader.releaseLock()
  }
}
}