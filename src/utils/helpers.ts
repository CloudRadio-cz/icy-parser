/**
 * Concatenates two Uint8Array buffers into a single buffer.
 *
 * @param a - The first buffer
 * @param b - The second buffer to append
 * @returns A new Uint8Array containing the contents of both buffers
 *
 * @internal
 */
export function concat(a: Uint8Array, b: Uint8Array): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(a.length + b.length)
  out.set(a)
  out.set(b, a.length)
  return out
}

/**
 * Parses an ICY metadata string and extracts known fields.
 *
 * ICY metadata is formatted as semicolon-separated key='value' pairs.
 * Currently extracts the `StreamTitle` field.
 *
 * @param raw - The raw metadata string from the stream
 * @returns An object containing parsed metadata fields
 *
 * @example
 * ```typescript
 * const result = parseMetadata("StreamTitle='Artist - Song';");
 * console.log(result.title); // "Artist - Song"
 * ```
 *
 * @internal
 */
export function parseMetadata(raw: string): { title: string | undefined } {
  return {
    title: /StreamTitle='([^']*)'/.exec(raw)?.[1]
  }
}