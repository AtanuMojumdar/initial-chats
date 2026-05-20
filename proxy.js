import { NextResponse } from 'next/server';

const HASHED_PASSWORD = '23882ec67c3f108c17e1c3f99f62b9a1f461ddfd591fa586d2a03a3910fb1e8e';

export function proxy(request) {
  const { pathname } = request.nextUrl;

  // Retrieve the session cookie
  const session = request.cookies.get('wa_viewer_session')?.value;

  // Check if the request is for the login page or the auth API
  const isAuthPage = pathname === '/login';
  const isAuthApi = pathname.startsWith('/api/auth');

  // If authenticated and tries to go to `/login`, redirect to `/`
  if (session === HASHED_PASSWORD && isAuthPage) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // If NOT authenticated and trying to access protected page/API, enforce login
  if (session !== HASHED_PASSWORD && !isAuthPage && !isAuthApi) {
    // For API routes, return a 401 JSON response instead of redirecting
    if (pathname.startsWith('/api/')) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    // Redirect to login page
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - static image/SVG files (logo, avatars) in public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
