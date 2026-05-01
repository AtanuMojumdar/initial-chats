import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  const resolvedParams = await params;
  const { filename } = resolvedParams;
  if (!filename) {
    return new NextResponse('File not found', { status: 404 });
  }

  // Join path params if it's a catch-all, but here it's just a string or array
  const fileStr = decodeURIComponent(Array.isArray(filename) ? filename.join('/') : filename);
  
  // The media files are located in the parent directory "WhatsApp Chat with Atanu"
  const filePath = path.join(process.cwd(), '../WhatsApp Chat with Atanu', fileStr);

  try {
    if (!fs.existsSync(filePath)) {
      return new NextResponse('File not found', { status: 404 });
    }

    const fileBuffer = fs.readFileSync(filePath);
    
    // Determine content type based on extension
    const ext = path.extname(fileStr).toLowerCase();
    let contentType = 'application/octet-stream';
    if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
    else if (ext === '.png') contentType = 'image/png';
    else if (ext === '.webp' || ext === '.was') contentType = 'image/webp';
    else if (ext === '.gif') contentType = 'image/gif';
    else if (ext === '.mp4') contentType = 'video/mp4';
    else if (ext === '.webm') contentType = 'video/webm';
    else if (ext === '.mov') contentType = 'video/quicktime';
    else if (ext === '.avi') contentType = 'video/x-msvideo';
    else if (ext === '.mp3') contentType = 'audio/mpeg';
    else if (ext === '.opus') contentType = 'audio/ogg; codecs=opus';
    else if (ext === '.wa') contentType = 'audio/ogg; codecs=opus'; // .wa is often opus
    else if (ext === '.ogg') contentType = 'audio/ogg';
    else if (ext === '.m4a') contentType = 'audio/mp4';
    else if (ext === '.wav') contentType = 'audio/wav';
    else if (ext === '.pdf') contentType = 'application/pdf';

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Error serving media:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
