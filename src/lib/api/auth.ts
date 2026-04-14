import { supabase } from '$lib/api/supabaseClient';
import { user } from '$store/user';
import { addToast } from '../../store/toast';

export async function signInWithEmail(email: string, password: string) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      console.error('[signInWithEmail] Login error:', error.message);
      addToast({
        message: 'Login failed. Please check your email and password.',
        type: 'error',
        duration: 5000
      });
      throw error;
    }

    // Don't manually set the user store here - let the onAuthStateChange listener in user.ts handle it
    // This ensures profile data gets properly merged with session user
    console.log('[signInWithEmail] User signed in successfully');

    // Ensure profile exists for the user
    if (data.user) {
      ensureProfileExists(data.user.id, data.user.user_metadata?.username || 'New User');
    }

    return data;
  } catch (err) {
    console.error('[signInWithEmail] Exception caught:', err);
    addToast({
      message: 'An unexpected error occurred. Please try again later.',
      type: 'error',
      duration: 5000
    });
    throw err;
  }
}



export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${location.origin}/dashboard`, // optional
    },
  });

  if (error) {
    console.error('Google sign-in error:', error.message);
    addToast({
      message: 'Google sign-in failed. Please try again.',
      type: 'error',
      duration: 5000
    });
    throw error;
  }

  // Don't manually set the user store here - let the onAuthStateChange listener in user.ts handle it
  // This ensures profile data gets properly merged with session user
  console.log('Google sign-in initiated successfully');

  return data;
}

export async function signUpWithEmail(email: string, password: string) {
  console.log('Signing up with email:', email);
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // emailRedirectTo: `${location.origin}/dashboard`, // optional
    },
  });

  if (error) {
    console.error('Sign-up error:', error.message);
    addToast({
      message: 'Sign-up failed. Please check your email and password.',
      type: 'error',
      duration: 5000
    });
    throw error;
  }

  return data;
}

export async function createProfileIfMissing(id: string, username: string) {

  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', id)
    .single();

  if (existing) return;

  console.log('Creating new profile for user:', id);

  const { error: insertError } = await supabase
    .from('profiles')
    .insert([{ id, username }]);

  if (insertError) {
    console.error('Failed to create profile:', insertError.message);
    addToast({
      message: 'Failed to create profile. Please try again later.',
      type: 'error',
      duration: 5000
    });
    throw insertError;
  }
}

export async function updateEmail(newEmail: string) {
  // Update email in auth
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    console.error('Error fetching current user:', userError?.message);
    addToast({
      message: 'Failed to fetch user data. Please try again later.',
      type: 'error',
      duration: 5000
    });
    throw userError || new Error('No user found');
  }

  const { error: authError } = await supabase.auth.updateUser({
    email: newEmail,
  });
  if (authError) {
    console.error('Error updating email in auth:', authError.message);
    addToast({
      message: 'Failed to update email. Please try again later.',
      type: 'error',
      duration: 5000
    });
    throw authError;
  }

  // Update email in profile
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ email: newEmail })
    .eq('id', user.id);

  if (profileError) {
    console.error('Error updating email in profile:', profileError.message);
    addToast({
      message: 'Failed to update email in profile. Please try again later.',
      type: 'error',
      duration: 5000
    });
    throw profileError;
  }

  return true;
}

export async function updateUsername(newUsername: string) {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    console.error('Error fetching current user:', userError?.message);
    addToast({
      message: 'Failed to fetch user data. Please try again later.',
      type: 'error',
      duration: 5000
    });
    throw userError || new Error('No user found');
  }

  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) {
    addToast({
      message: 'No access token found. Please log in again.',
      type: 'error',
      duration: 5000
    });
    throw new Error('No access token found');
  }
  const response = await fetch(`${import.meta.env.VITE_API_URL}/users/updateUsername`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      userId: user.id,
      username: newUsername
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Error updating username:', errorText);
    addToast({
      message: 'Failed to update username. Please try again later.',
      type: 'error',
      duration: 5000
    });
    throw new Error(errorText || 'Failed to update username');
  }

  console.log('Username updated successfully');
  return true;
}

export async function logOut() {
  // Remove session and user data from stores

  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('Log out error:', error.message);
    addToast({
      message: 'Log out failed. Please try again later.',
      type: 'error',
      duration: 5000
    });
    throw error;
  }

  user.set(null);

  console.log('Log out successful');
  return true;
}

export async function deleteUser(userId: string) {
  const { error } = await supabase.auth.admin.deleteUser(userId);

  if (error) {
    console.error("Error deleting user:", error);
    addToast({
      message: 'Failed to delete user. Please try again later.',
      type: 'error',
      duration: 5000
    });
    throw error;
  }

  console.log("User deleted successfully");
}

// create profile row if it doesn't exist
export async function ensureProfileExists(userId: string, username: string) {
  try {
    await createProfileIfMissing(userId, username);
    console.log('Profile ensured for user:', userId);
  } catch (error) {
    console.error('Error ensuring profile exists:', error);
    addToast({
      message: 'Failed to ensure profile exists. Please try again later.',
      type: 'error',
      duration: 5000
    });
    throw error;
  }
}