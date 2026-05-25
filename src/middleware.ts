import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

// Specify paths that require auth check
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Let Supabase refresh the session cookie
  const { supabaseResponse, user, supabase } = await updateSession(request);

  // 2. Define public routes (no authentication needed)
  const isPublicRoute = 
    pathname.startsWith('/login') || 
    pathname.startsWith('/reset-password') || 
    pathname.startsWith('/api/auth/callback');

  // 3. Authentication Guard
  if (!user) {
    if (!isPublicRoute) {
      // Not logged in and trying to access a protected page: redirect to login
      const redirectUrl = new URL('/login', request.url);
      // Save original destination to redirect back after login
      if (pathname !== '/') {
        redirectUrl.searchParams.set('redirected_to', pathname);
      }
      return NextResponse.redirect(redirectUrl);
    }
    return supabaseResponse;
  }

  // 4. Session exists, fetch User Profile from Database
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  // 5. Account Disabled Guard
  if (profile && profile.status === 'inactive') {
    // Session is active but administrator deactivated the user: force sign out
    const response = NextResponse.redirect(new URL('/login?error=account_disabled', request.url));
    // Clear cookies/session
    response.cookies.delete('sb-access-token');
    response.cookies.delete('sb-refresh-token');
    return response;
  }

  // 6. Logged-in users attempting to access auth pages (Login / Register): Redirect to Dashboard
  if (isPublicRoute) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // 7. Route and Module Level Authorization Guards
  if (profile) {
    // A. Admin panel guard
    if (pathname.startsWith('/admin') && !profile.user_management_access && profile.role !== 'super_admin' && profile.role !== 'admin') {
      return NextResponse.redirect(new URL('/?error=unauthorized_admin', request.url));
    }

    // B. Dashboard module guard & redirection
    if (pathname === '/dashboard' || pathname.startsWith('/dashboard/')) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    if (pathname === '/' && !profile.dashboard_access) {
      return NextResponse.redirect(new URL('/login?error=no_module_access', request.url));
    }

    // C. Materials guard
    if (pathname.startsWith('/materials') && !profile.materials_access) {
      return NextResponse.redirect(new URL('/?error=unauthorized_module', request.url));
    }

    // D. Goods Inward guard
    if (pathname.startsWith('/inward') && !profile.goods_inward_access) {
      return NextResponse.redirect(new URL('/?error=unauthorized_module', request.url));
    }

    // E. Goods Outward guard
    if (pathname.startsWith('/outward') && !profile.goods_outward_access) {
      return NextResponse.redirect(new URL('/?error=unauthorized_module', request.url));
    }

    // F. Reports guard
    if (pathname.startsWith('/reports') && !profile.reports_access) {
      return NextResponse.redirect(new URL('/?error=unauthorized_module', request.url));
    }

    // G. Analytics guard
    if (pathname.startsWith('/analytics') && !profile.analytics_access) {
      return NextResponse.redirect(new URL('/?error=unauthorized_module', request.url));
    }

    // H. Settings guard
    if (pathname.startsWith('/settings') && !profile.settings_access) {
      return NextResponse.redirect(new URL('/?error=unauthorized_module', request.url));
    }
  }

  return supabaseResponse;
}
