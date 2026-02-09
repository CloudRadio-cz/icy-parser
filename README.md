# @cloudradio/icy-parser

A lightweight, zero-dependency metadata parser for ICY (SHOUTcast/Icecast) compatible streams. Works with any runtime that supports the Fetch API (Node.js 18+, Bun, Deno, browsers).

## Installation

```bash
# npm
npm install @cloudradio/icy-parser

# bun
bun add @cloudradio/icy-parser

# jsr (Deno)
deno add jsr:@cloudradio/icy-parser
```

## Usage

```typescript
import { IcyParser } from "@cloudradio/icy-parser";

const parser = new IcyParser("https://radio.example.com/stream.mp3");
const metadata = await parser.parseOnce();

console.log(metadata.title);   // "Artist - Song"
console.log(metadata.name);    // "My Radio Station"
console.log(metadata.bitrate); // 128
```

## API

### `new IcyParser(url: string)`

Creates a new parser instance for the given stream URL.

### `parser.parseOnce(): Promise<IcyMetadata>`

Connects to the stream, reads until the first metadata block is found, extracts it, and closes the connection. This is a one-shot operation -- call it again whenever you need fresh metadata.

#### Errors

| Error | Cause |
|---|---|
| `Stream does not support ICY metadata` | The server didn't return an `icy-metaint` header |
| `Stream ended before metadata was received` | The stream closed before enough audio data was received |
| `Failed to read metadata from stream` | The metadata chunk couldn't be read |

### `IcyMetadata`

| Field | Type | Description |
|---|---|---|
| `raw` | `string` | The raw metadata string from the stream |
| `title` | `string \| undefined` | Current stream title (e.g. `"Artist - Song"`) |
| `name` | `string \| undefined` | Station name (`icy-name` header) |
| `genre` | `string \| undefined` | Station genre (`icy-genre` header) |
| `url` | `string \| undefined` | Station URL (`icy-url` header) |
| `bitrate` | `number` | Stream bitrate in kbps (`icy-br` header) |
| `contentType` | `string \| undefined` | Content type (e.g. `"audio/mpeg"`) |
| `server` | `string \| undefined` | Server software (`server` header) |

## How it works

ICY-compatible servers interleave metadata within the audio stream at a fixed byte interval declared via the `icy-metaint` response header. The parser:

1. Sends a request with the `Icy-MetaData: 1` header to opt in to inline metadata.
2. Reads and discards audio bytes until it reaches the metadata boundary.
3. Reads the metadata length byte and the subsequent metadata payload.
4. Parses the `key='value'` pairs from the metadata string.
5. Combines inline metadata with ICY response headers and returns the result.
6. Aborts the connection immediately after extraction to avoid unnecessary data transfer.

## License

[MIT](LICENSE)
