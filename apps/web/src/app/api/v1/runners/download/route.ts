import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

function findBinaryPath(fileName: string): string | null {
  const candidatePaths = [
    path.resolve(process.cwd(), '../desktop/dist', fileName),
    path.resolve(process.cwd(), 'apps/desktop/dist', fileName),
    path.resolve(process.cwd(), 'dist', fileName),
    path.resolve(process.cwd(), '../../apps/desktop/dist', fileName)
  ];

  for (const candidate of candidatePaths) {
    try {
      if (fs.existsSync(/*turbopackIgnore: true*/ candidate)) {
        return candidate;
      }
    } catch {
      // Continue search on filesystem error
    }
  }

  return null;
}

function nodeStreamToReadable(nodeStream: fs.ReadStream): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      nodeStream.on('data', (chunk: Buffer | string) => {
        const buffer = typeof chunk === 'string' ? Buffer.from(chunk) : chunk;
        controller.enqueue(new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength));
      });
      nodeStream.on('end', () => {
        controller.close();
      });
      nodeStream.on('error', (err) => {
        controller.error(err);
      });
    },
    cancel() {
      nodeStream.destroy();
    },
  });
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const rawType = (searchParams.get('type') || 'installer').toLowerCase();

  const isPortable = rawType === 'portable' || rawType === 'zip';
  const primaryFileName = isPortable
    ? 'ReFlow-Worker-Portable-1.0.0.exe'
    : 'ReFlow-Worker-Setup-1.0.0.exe';
  const legacyFileName = isPortable
    ? 'FlowMind-Worker-Portable-1.0.0.exe'
    : 'FlowMind-Worker-Setup-1.0.0.exe';
  const binaryPath = findBinaryPath(primaryFileName) || findBinaryPath(legacyFileName);
  const fileName = binaryPath ? path.basename(binaryPath) : primaryFileName;

  if (binaryPath) {
    try {
      const stat = fs.statSync(/*turbopackIgnore: true*/ binaryPath);
      const readStream = fs.createReadStream(/*turbopackIgnore: true*/ binaryPath);
      const webStream = nodeStreamToReadable(readStream);

      return new NextResponse(webStream, {
        status: 200,
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${fileName}"`,
          'Content-Length': stat.size.toString(),
          'Cache-Control': 'public, max-age=86400',
        },
      });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown stream error';
      return NextResponse.json(
        { error: 'Failed to stream binary file', details: errorMsg },
        { status: 500 }
      );
    }
  }

  return NextResponse.json(
    {
      error: 'Desktop runner binary package not found on current host',
      fileName,
      requestedType: isPortable ? 'portable' : 'installer',
      availableInRepo: 'apps/desktop/dist/',
      tip: 'Run `npm run build:win --prefix apps/desktop` to regenerate prebuilt binaries if missing.',
    },
    { status: 404 }
  );
}
