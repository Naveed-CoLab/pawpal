import { NextRequest } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const isMobile = requestUrl.searchParams.get('platform') === 'mobile';

  if (code) {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    try {
      await supabase.auth.exchangeCodeForSession(code);
      // For web, continue with session creation
    } catch (error) {
      console.error('Error exchanging code for session:', error);
      return Response.redirect(`${requestUrl.origin}/auth?error=auth_callback_error`);
    }
  }

  // Handle both web and mobile redirects
  if (isMobile) {
    // Mobile redirect using the app scheme
    return Response.redirect(`vetpaw://auth-callback`);
  } else {
    // Web redirect to the app homepage
    return Response.redirect(`${requestUrl.origin}/(tabs)/`);
  }
}