import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, readSessionToken, requiresAdmin } from "@/lib/auth";

/**
 * The gate. Every route passes through here before it renders.
 *
 * `proxy.ts`, not `middleware.ts`: the middleware convention is deprecated in
 * Next 16 and renamed, and Proxy now defaults to the Node.js runtime — which
 * is why `lib/auth` can use `node:crypto` directly instead of hand-rolling
 * HMAC verification against Web Crypto.
 *
 * Enforcement lives here rather than in each page because a check a page
 * performs is a check the next page can forget. Server actions POST to their
 * own route path, so protecting `/upload` protects the upload actions too —
 * and `app/upload/actions.ts` re-checks the role itself, because a single
 * layer of authorisation is one deployment misconfiguration away from none.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const role = readSessionToken(request.cookies.get(SESSION_COOKIE)?.value);

  const authorised = role !== null && (!requiresAdmin(pathname) || role === "admin");

  if (!authorised) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", `${pathname}${search}`);
    // Tells the login screen to say "this needs the admin password" rather
    // than implying the viewer's credential was wrong.
    if (role === "viewer") url.searchParams.set("need", "admin");
    return withNoIndex(NextResponse.redirect(url));
  }

  return withNoIndex(NextResponse.next());
}

/**
 * Belt and braces against the window this app has already spent public. Even
 * behind the gate nothing here should ever appear in a search index — the
 * page titles alone would name the ministry and its people.
 */
function withNoIndex(response: NextResponse): NextResponse {
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  return response;
}

export const config = {
  /**
   * Everything except the login screen itself, Next's own assets, and the
   * files a browser fetches before it can render anything. Matching too
   * broadly would redirect the login page's own stylesheet to the login page.
   */
  matcher: ["/((?!login|_next/static|_next/image|favicon.ico|robots.txt|.*\\.png$).*)"],
};
