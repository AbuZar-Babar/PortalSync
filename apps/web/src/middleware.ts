import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from './lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  try {
    return await updateSession(request);
  } catch (err) {
    console.error('[Middleware] Unexpected error:', err);
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public assets (*.svg, *.png, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
