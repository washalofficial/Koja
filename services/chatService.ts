
import { supabase } from '../utils/supabaseClient';
import { Message, Conversation, User } from '../types';

export const chatService = {
  // Create or Get existing conversation between two users
  async startConversation(otherUserId: string): Promise<string | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // 1. Check if conversation already exists
    // This is a simplified check. A proper SQL function is better for performance.
    const { data: myConvos } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', user.id);

    if (myConvos) {
      for (const con of myConvos) {
        const { data: other } = await supabase
          .from('conversation_participants')
          .select('conversation_id')
          .eq('conversation_id', con.conversation_id)
          .eq('user_id', otherUserId)
          .single();
        
        if (other) return con.conversation_id;
      }
    }

    // 2. Create new conversation
    const { data: newConvo, error } = await supabase
      .from('conversations')
      .insert({})
      .select()
      .single();

    if (error || !newConvo) return null;

    // 3. Add participants
    await supabase.from('conversation_participants').insert([
      { conversation_id: newConvo.id, user_id: user.id },
      { conversation_id: newConvo.id, user_id: otherUserId }
    ]);

    return newConvo.id;
  },

  // Get all conversations for current user
  async getConversations(): Promise<Conversation[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    // Get my conversation IDs
    const { data: participantRows } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', user.id);

    if (!participantRows || participantRows.length === 0) return [];

    const conversationIds = participantRows.map(r => r.conversation_id);

    // Fetch conversations with recent messages
    const { data: conversations } = await supabase
      .from('conversations')
      .select('*')
      .in('id', conversationIds)
      .order('updated_at', { ascending: false });

    if (!conversations) return [];

    const result: Conversation[] = [];

    for (const c of conversations) {
      // Fetch participants for this conversation
      const { data: parts } = await supabase
        .from('conversation_participants')
        .select('user_id')
        .eq('conversation_id', c.id);
      
      const participantIds = parts?.map(p => p.user_id).filter(id => id !== user.id) || [];
      
      // Fetch User Details
      if (participantIds.length > 0) {
        const { data: users } = await supabase
          .from('users')
          .select('*')
          .in('id', participantIds);
        
        const mappedUsers: User[] = (users || []).map(u => ({
          id: u.id,
          username: u.username,
          fullName: u.full_name,
          avatarUrl: u.profile_url,
          followers: u.followers_count
        }));

        // Fetch Last Message
        const { data: lastMsg } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', c.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        result.push({
          id: c.id,
          participants: mappedUsers,
          updatedAt: c.updated_at,
          lastMessage: lastMsg ? {
            id: lastMsg.id,
            conversationId: lastMsg.conversation_id,
            senderId: lastMsg.sender_id,
            content: lastMsg.content,
            createdAt: lastMsg.created_at,
            isRead: lastMsg.is_read
          } : undefined
        });
      }
    }

    return result;
  },

  // Send a message
  async sendMessage(conversationId: string, content: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: content
      });

    if (!error) {
      // Update conversation timestamp
      await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId);
      return true;
    }
    return false;
  },

  // Subscribe to new messages
  subscribeToMessages(conversationId: string, callback: (msg: Message) => void) {
    return supabase
      .channel(`chat:${conversationId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages', 
        filter: `conversation_id=eq.${conversationId}` 
      }, (payload) => {
        const newMsg = payload.new as any;
        callback({
          id: newMsg.id,
          conversationId: newMsg.conversation_id,
          senderId: newMsg.sender_id,
          content: newMsg.content,
          createdAt: newMsg.created_at,
          isRead: newMsg.is_read
        });
      })
      .subscribe();
  }
};
