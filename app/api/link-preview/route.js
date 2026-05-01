import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5-second timeout

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 WhatsApp/1.0',
        'Accept': 'text/html'
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Failed to fetch with status ${res.status}`);
    }

    // Only read first 50KB to prevent parsing massive files
    const htmlChunk = await res.text();
    const html = htmlChunk.slice(0, 50000);

    // Simple Regex parser for meta tags
    const getMeta = (property) => {
      // Matches <meta property="og:title" content="The Title">
      const regex = new RegExp(`<meta[^>]*?(?:property|name)=["']${property}["'][^>]*?content=["']([^"']*)["']`, 'i');
      const match = html.match(regex);
      if (match) return match[1];
      
      // Matches <meta content="The Title" property="og:title">
      const regexAlt = new RegExp(`<meta[^>]*?content=["']([^"']*)["'][^>]*?(?:property|name)=["']${property}["']`, 'i');
      const matchAlt = html.match(regexAlt);
      return matchAlt ? matchAlt[1] : null;
    };

    // Extract Title
    let title = getMeta('og:title') || getMeta('twitter:title');
    if (!title) {
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      title = titleMatch ? titleMatch[1] : null;
    }

    // Extract Description
    const description = getMeta('og:description') || getMeta('twitter:description') || getMeta('description') || null;

    // Extract Image
    const image = getMeta('og:image') || getMeta('twitter:image') || null;

    // Extract Domain
    let domain = '';
    try {
      domain = new URL(url).hostname.replace('www.', '');
    } catch (e) {
      domain = url;
    }

    return NextResponse.json({ 
      title: title ? title.trim() : null, 
      description: description ? description.trim() : null, 
      image, 
      domain, 
      url 
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=43200' // Cache aggressively (24h)
      }
    });

  } catch (error) {
    console.warn(`Link preview fetch failed for ${url}:`, error.message);
    return NextResponse.json({ error: 'Failed to fetch metadata', url }, { status: 500 });
  }
}
