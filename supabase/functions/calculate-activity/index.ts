import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

serve(async (req) => {
  try {
    // 1. Fetch all users
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id');

    if (usersError) throw usersError;

    const metrics = await Promise.all(users.map(async (user) => {
      const userId = user.id;

      // 2. Calculate metrics for each user
      const { count: total_messages } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId);

      const { count: rooms_created } = await supabase
        .from('chatroom_ad') // Corrected table name
        .select('chatroom_id', { count: 'exact', head: true })
        .eq('user_id', userId);

      // NOTE: total_reactions_received is simplified for now
      const { data: userMessages, error: userMessagesError } = await supabase
        .from('messages')
        .select('id')
        .eq('user_id', userId);

      let total_reactions_received = 0;
      if (userMessages) {
        const messageIds = userMessages.map(m => m.id);
        const { count: likeCount } = await supabase
            .from('message_likes')
            .select('id', { count: 'exact', head: true })
            .in('message_id', messageIds);
        const { count: dislikeCount } = await supabase
            .from('message_dislikes')
            .select('id', { count: 'exact', head: true })
            .in('message_id', messageIds);
        total_reactions_received = (likeCount || 0) + (dislikeCount || 0);
      }

      return {
        user_id: userId,
        total_messages: total_messages || 0,
        rooms_created: rooms_created || 0,
        total_reactions_received: total_reactions_received,
        updated_at: new Date().toISOString(),
        // Placeholders for features not yet implemented
        total_activity_time_minutes: 0,
        total_shares: 0,
        participants_in_rooms: 0,
      };
    }));

    // 3. Upsert metrics into the database
    const { error: upsertError } = await supabase
      .from('user_activity_metrics')
      .upsert(metrics, { onConflict: 'user_id' });

    if (upsertError) throw upsertError;

    return new Response(JSON.stringify({ message: `Successfully calculated metrics for ${metrics.length} users.` }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
