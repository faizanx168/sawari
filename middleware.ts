import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { securityHeaders } from './app/utils/security';

// Initialize rate limiter
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

// More permissive rate limit for API routes
const apiRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(200, '1 m'), // 200 requests per minute
});

// Stricter rate limit for other routes
const pageRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(50, '1 m'), // 50 requests per minute
});

// Helper function to get client IP
const getClientIp = (request: NextRequest): string => {
  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  if (forwardedFor) {
    return forwardedFor;
  }
  return request.headers.get('x-real-ip') || 
         request.headers.get('x-forwarded-for') || 
         '127.0.0.1';
};

// Authentication routes that should bypass rate limiting and other middleware
const authRoutes = [
  '/api/auth/signin',
  '/api/auth/signout',
  '/api/auth/session',
  '/api/auth/csrf',
  '/api/auth/callback',
  '/api/auth/verify-request',
  '/api/auth/error',
  '/login',
  '/register'
];

// API routes that need higher rate limits
const apiRoutes = [
  '/api/notifications',
  '/api/rides',
  '/api/bookings',
  '/api/cars',
  '/api/users',
  '/api/reviews',
  '/api/upload',
  '/api/geocode'
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for authentication-related routes
  if (authRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Skip rate limiting in development
  if (process.env.NODE_ENV === 'development') {
    return NextResponse.next();
  }

  // Apply different rate limits based on route type
  const ip = getClientIp(request);
  let rateLimitResult;
  
  if (apiRoutes.some(route => pathname.startsWith(route))) {
    rateLimitResult = await apiRatelimit.limit(ip);
  } else {
    rateLimitResult = await pageRatelimit.limit(ip);
  }
  
  const { success, limit, reset, remaining } = rateLimitResult;

  // Add rate limit headers to response
  const response = NextResponse.next();
  response.headers.set('X-RateLimit-Limit', limit.toString());
  response.headers.set('X-RateLimit-Remaining', remaining.toString());
  response.headers.set('X-RateLimit-Reset', reset.toString());

  // Block request if rate limit exceeded
  if (!success) {
    return new NextResponse('Too Many Requests', {
      status: 429,
      headers: {
        'Retry-After': reset.toString(),
      },
    });
  }

  // Apply security headers
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  // Add CORS headers
  const origin = request.headers.get('origin');
  const corsOrigins = process.env.CORS_ORIGINS || '';
  const allowedOrigins = corsOrigins.split(',').filter(Boolean);
  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }

  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers: response.headers,
    });
  }

  return response;
}

// Configure which routes to run middleware on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}; 