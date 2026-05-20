export const runtime = 'edge';

import { NextResponse } from 'next/server';
import driveMap from '../../../../driveMap.json';

export async function GET(request, { params }) {
  const resolvedParams = await params;
  const { filename } = resolvedParams;
  
  if (!filename) {
    return new NextResponse('File not found', { status: 404 });
  }

  const fileStr = decodeURIComponent(Array.isArray(filename) ? filename.join('/') : filename);
  
  const fileId = driveMap[fileStr];
  
  if (!fileId) {
    return new NextResponse('File not found', { status: 404 });
  }

  try {
    const driveUrl = `https://drive.google.com/uc?export=download&id=${fileId}&confirm=t`;
    
    // We proxy the fetch to Google Drive to keep inline display and avoid CORS/Download issues
    const res = await fetch(driveUrl, {
      headers: {
        // Pass Range header if the client provided one (for videos/audios)
        ...(request.headers.get('range') && { 'Range': request.headers.get('range') })
      }
    });

    if (!res.ok) {
      return new NextResponse('Error fetching from Drive', { status: res.status });
    }

    const headers = new Headers(res.headers);
    headers.delete('content-disposition');
    headers.set('Access-Control-Allow-Origin', '*');

    // Override Content-Type to ensure browser handles it inline correctly
    const ext = fileStr.split('.').pop().toLowerCase();
    let contentType = 'application/octet-stream';
    if (ext === 'jpg' || ext === 'jpeg') contentType = 'image/jpeg';
    else if (ext === 'png') contentType = 'image/png';
    else if (ext === 'webp' || ext === 'was') contentType = 'image/webp';
    else if (ext === 'gif') contentType = 'image/gif';
    else if (ext === 'mp4') contentType = 'video/mp4';
    else if (ext === 'webm') contentType = 'video/webm';
    else if (ext === 'mov') contentType = 'video/quicktime';
    else if (ext === 'avi') contentType = 'video/x-msvideo';
    else if (ext === 'mp3') contentType = 'audio/mpeg';
    else if (ext === 'opus' || ext === 'wa' || ext === 'ogg') contentType = 'audio/ogg; codecs=opus';
    else if (ext === 'm4a') contentType = 'audio/mp4';
    else if (ext === 'wav') contentType = 'audio/wav';
    else if (ext === 'pdf') contentType = 'application/pdf';

    headers.set('Content-Type', contentType);
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');

    return new NextResponse(res.body, {
      status: res.status,
      headers
    });
  } catch (error) {
    console.error('Error proxying media:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
