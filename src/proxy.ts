import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const EXACT_PUBLIC_PATHS = ['/']
const PREFIX_PUBLIC_PATHS = [
  '/login',
  '/signup',
  '/api/vapi/webhook',
  '/api/google/oauth/callback',
  '/api/auth',
]

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet, cacheHeaders) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
          Object.entries(cacheHeaders ?? {}).forEach(([key, value]) =>
            supabaseResponse.headers.set(key, value)
          )
        },
      },
    }
  )

  // Refresh session — must use getClaims(), never getSession() in proxy
  const claimsResult = await supabase.auth.getClaims()
  const isAuthenticated = !!claimsResult.data

  const path = request.nextUrl.pathname
  const isPublicPath =
    EXACT_PUBLIC_PATHS.includes(path) ||
    PREFIX_PUBLIC_PATHS.some((p) => path.startsWith(p))

  if (!isAuthenticated && !isPublicPath) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (isAuthenticated && (path === '/login' || path === '/signup')) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
