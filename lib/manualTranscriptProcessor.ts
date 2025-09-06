import { ApiConfig } from '@/constants/apiConfig';

export async function processSessionTranscriptManually(conversationId: string) {
  console.log('🔧 Manually processing transcript for:', conversationId);
  
  try {
    // Call our own webhook function to process this session
    const webhookUrl = ApiConfig.TAVUS.WEBHOOK_URL;
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer fake-auth-for-manual-trigger', // Add auth if needed
      },
      body: JSON.stringify({
        event_type: 'manual_transcript_processing',
        conversation_id: conversationId,
        timestamp: new Date().toISOString(),
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Webhook call failed: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('✅ Manual processing result:', result);
    return result;
    
  } catch (error) {
    console.error('❌ Manual processing failed:', error);
    throw error;
  }
}

// Process all recent sessions that might be missing transcripts
export async function processRecentSessions() {
  const recentSessions = [
    'c7a719f3f055f4d1',
    'cace2f3a54b44409'
  ];
  
  for (const sessionId of recentSessions) {
    try {
      await processSessionTranscriptManually(sessionId);
      console.log('✅ Processed:', sessionId);
    } catch (error) {
      console.error('❌ Failed to process:', sessionId, error);
    }
  }
} 