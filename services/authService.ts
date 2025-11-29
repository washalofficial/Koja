
import { supabase } from '../utils/supabaseClient';
import { storage } from '../utils/storage';
import { User } from '../types';

// The specific requested profile
const JANI_BRAND_USER: User = {
  id: 'jani-brand-official-id',
  username: 'Jani brand',
  fullName: 'Jani Brand Official',
  avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop',
  followers: 10500,
  isAdmin: true
};

const CREDENTIALS = {
  email: 'washal.official1@gmail.com',
  password: '548413'
};

export const authService = {
  // Check if someone is logged in
  getCurrentUser: (): User | null => {
    return storage.getCurrentUser();
  },

  // Log Out
  logout: async () => {
    await supabase.auth.signOut();
    storage.clearUser();
  },

  // Sign Up
  signup: async (email: string, password: string, username: string): Promise<{ user: User | null; error: string | null }> => {
    try {
      // 1. Create Auth User in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username: username }
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        // 2. Create Public Profile in 'users' table
        // This is critical so the user exists in the relational DB for foreign keys (videos, likes, etc)
        const newDbUser = {
          id: authData.user.id,
          username: username,
          full_name: username, 
          profile_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=random`,
          followers_count: 0,
          created_at: new Date().toISOString(),
          email: email // Include email as it is often required/useful
        };
        
        const { error: dbError } = await supabase
          .from('users')
          .insert([newDbUser]);

        if (dbError) {
          console.error("Failed to create public user profile:", dbError.message || dbError);
          // Fallback: If 'users' table insert fails, we might still want to log them in locally
          // but features might be broken. Proceeding with best effort.
        }

        // 3. Create App User Object
        const newUser: User = {
          id: authData.user.id,
          username: username,
          fullName: username,
          avatarUrl: newDbUser.profile_url,
          followers: 0
        };
        
        // 4. Save Session Locally
        storage.saveUser(newUser);
        return { user: newUser, error: null };
      }
      return { user: null, error: "Signup failed: No user data returned" };
    } catch (e: any) {
      return { user: null, error: e.message || "An unexpected error occurred during signup" };
    }
  },

  // Log In
  login: async (email: string, password: string): Promise<{ user: User | null; error: string | null }> => {
    // --- SPECIAL BYPASS FOR REQUESTED PROFILE ---
    if (email.toLowerCase() === CREDENTIALS.email.toLowerCase() && password === CREDENTIALS.password) {
      const adminUser = { ...JANI_BRAND_USER, isAdmin: true };
      storage.saveUser(adminUser);
      return { user: adminUser, error: null };
    }
    // ---------------------------------------------

    try {
      // 1. Authenticate with Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      if (data.user) {
        // 2. Fetch Public Profile from 'users' table
        // This ensures we get the persisted data (avatar, followers, real username)
        let { data: profile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', data.user.id)
          .single();

        // SELF-HEALING: If profile doesn't exist (e.g. signup insert failed), try to create it now
        if (!profile) {
            console.warn("User profile missing, attempting to recreate...");
            const username = data.user.user_metadata?.username || email.split('@')[0];
            const newDbUser = {
                id: data.user.id,
                username: username,
                full_name: username, 
                profile_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=random`,
                followers_count: 0,
                created_at: new Date().toISOString(),
                email: email
            };
            
            const { data: newProfile, error: insertError } = await supabase
                .from('users')
                .insert([newDbUser])
                .select()
                .single();
            
            if (!insertError && newProfile) {
                profile = newProfile;
            } else if (insertError) {
                console.error("Failed to recreate profile:", insertError.message);
            }
        }

        const username = profile?.username || data.user.user_metadata?.username || email.split('@')[0];
        const avatarUrl = profile?.profile_url || 'https://via.placeholder.com/150';
        const fullName = profile?.full_name || username;
        const followers = profile?.followers_count || 0;
        const isAdmin = profile?.is_admin || false;

        const loggedUser: User = {
          id: data.user.id,
          username: username,
          fullName: fullName,
          avatarUrl: avatarUrl,
          followers: followers,
          isAdmin: isAdmin
        };

        storage.saveUser(loggedUser);
        return { user: loggedUser, error: null };
      }
      return { user: null, error: "Login failed" };
    } catch (e: any) {
       return { user: null, error: e.message || "Invalid login credentials" };
    }
  },

  // Upload Avatar
  uploadAvatar: async (file: Blob): Promise<string | null> => {
    try {
      const user = storage.getCurrentUser();
      if (!user) return null;

      const fileName = `avatars/${user.id}_${Date.now()}.png`;
      const { error: uploadError } = await supabase.storage
        .from('samosatok-bucket')
        .upload(fileName, file, { upsert: true });

      if (uploadError) {
        if (uploadError.message.includes("Bucket not found")) {
            alert("Error: Storage bucket 'samosatok-bucket' not found in Supabase. Please run the provided SQL script in your Supabase Dashboard SQL Editor.");
        }
        console.error("Avatar upload error:", uploadError.message);
        throw uploadError;
      }

      const { data } = supabase.storage.from('samosatok-bucket').getPublicUrl(fileName);
      
      // Update User Profile
      const { error: dbError } = await supabase
        .from('users')
        .update({ profile_url: data.publicUrl })
        .eq('id', user.id);

      if (dbError) {
        console.error("Database update error:", dbError.message);
        throw dbError;
      }
      
      // Update Local Storage
      const updatedUser = { ...user, avatarUrl: data.publicUrl };
      storage.saveUser(updatedUser);
      
      return data.publicUrl;
    } catch (e: any) {
      console.error("Avatar upload failed:", e.message || e);
      return null;
    }
  }
};
