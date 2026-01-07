/**
 * CORS utility for API routes
 * Handles CORS headers and OPTIONS preflight requests
 */

export interface CorsOptions {
  origin?: string | string[] | boolean;
  methods?: string[];
  allowedHeaders?: string[];
  exposedHeaders?: string[];
  credentials?: boolean;
  maxAge?: number;
}

const DEFAULT_OPTIONS: Required<CorsOptions> = {
  origin: true, // Allow all origins in development
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  exposedHeaders: [],
  credentials: true,
  maxAge: 86400, // 24 hours
};

/**
 * Get the origin from the request
 */
function getOrigin(request: Request): string | null {
  return request.headers.get("Origin") || request.headers.get("Referer")?.split("/").slice(0, 3).join("/") || null;
}

/**
 * Check if origin is allowed
 */
function isOriginAllowed(origin: string | null, allowedOrigin: string | string[] | boolean): boolean {
  if (!origin) return false;
  
  if (allowedOrigin === true) return true;
  if (typeof allowedOrigin === "string") return origin === allowedOrigin;
  if (Array.isArray(allowedOrigin)) return allowedOrigin.includes(origin);
  
  return false;
}

/**
 * Create CORS headers
 */
export function createCorsHeaders(request: Request, options: CorsOptions = {}): Headers {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const headers = new Headers();
  const origin = getOrigin(request);

  // Set Access-Control-Allow-Origin
  if (opts.origin === true || (origin && isOriginAllowed(origin, opts.origin))) {
    headers.set("Access-Control-Allow-Origin", origin || "*");
  } else if (typeof opts.origin === "string") {
    headers.set("Access-Control-Allow-Origin", opts.origin);
  }

  // Set Access-Control-Allow-Methods
  if (opts.methods && opts.methods.length > 0) {
    headers.set("Access-Control-Allow-Methods", opts.methods.join(", "));
  }

  // Set Access-Control-Allow-Headers
  if (opts.allowedHeaders && opts.allowedHeaders.length > 0) {
    headers.set("Access-Control-Allow-Headers", opts.allowedHeaders.join(", "));
  }

  // Set Access-Control-Expose-Headers
  if (opts.exposedHeaders && opts.exposedHeaders.length > 0) {
    headers.set("Access-Control-Expose-Headers", opts.exposedHeaders.join(", "));
  }

  // Set Access-Control-Allow-Credentials
  if (opts.credentials) {
    headers.set("Access-Control-Allow-Credentials", "true");
  }

  // Set Access-Control-Max-Age
  if (opts.maxAge) {
    headers.set("Access-Control-Max-Age", opts.maxAge.toString());
  }

  return headers;
}

/**
 * Handle CORS preflight request (OPTIONS)
 */
export function handleCorsPreflight(request: Request, options: CorsOptions = {}): Response | null {
  if (request.method !== "OPTIONS") {
    return null;
  }

  const headers = createCorsHeaders(request, options);
  return new Response(null, { status: 204, headers });
}

/**
 * Add CORS headers to a response
 */
export function addCorsHeaders(response: Response, request: Request, options: CorsOptions = {}): Response {
  const corsHeaders = createCorsHeaders(request, options);
  
  // Copy CORS headers to response
  corsHeaders.forEach((value, key) => {
    response.headers.set(key, value);
  });

  return response;
}

/**
 * Create a CORS-enabled response
 */
export function corsResponse(
  data: any,
  request: Request,
  init: ResponseInit = {},
  corsOptions: CorsOptions = {}
): Response {
  // Handle preflight
  const preflightResponse = handleCorsPreflight(request, corsOptions);
  if (preflightResponse) {
    return preflightResponse;
  }

  // Create response
  const response = Response.json(data, init);
  
  // Add CORS headers
  return addCorsHeaders(response, request, corsOptions);
}

