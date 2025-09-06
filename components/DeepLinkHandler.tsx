import { useEffect } from 'react';
import * as Linking from 'expo-linking';
import { supabase } from '@/lib/supabase';

export function DeepLinkHandler() {
  useEffect(() => {
    const handleDeepLink = async (url: string) => {
      console.log('🔗 Deep link received:', url);
      
      // Check if it's an OAuth callback
      if (url.includes('code=')) {
        console.log('🔑 Processing OAuth callback...');
        
        try {
          // Extract the code from the URL
          const urlObj = new URL(url);
          const code = urlObj.searchParams.get('code');
          
          if (code) {
            console.log('🔄 Exchanging code for session...');
            
            // Exchange the code for a session
            const { data, error } = await supabase.auth.exchangeCodeForSession(code);
            
            if (error) {
              console.error('❌ Session exchange error:', error);
            } else if (data.session) {
              console.log('✅ Session established via deep link:', data.session.user?.email);
              
              // Wait a moment for the auth state to propagate
              await new Promise(resolve => setTimeout(resolve, 500));
              
              // Verify the session is accessible
              const { data: sessionCheck } = await supabase.auth.getSession();
              if (sessionCheck.session) {
                console.log('✅ Session verified after deep link processing');
              } else {
                console.log('⚠️ Session not found after deep link processing');
              }
            } else {
              console.log('❌ No session received from code exchange');
            }
          }
        } catch (error) {
          console.error('❌ Error processing OAuth callback:', error);
        }
      }
    };

    // Handle deep links when app is already open
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url);
    });

    // Handle deep links when app is opened from closed state
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink(url);
      }
    });

    return () => {
      subscription?.remove();
    };
  }, []);

  return null; // This component doesn't render anything
} 