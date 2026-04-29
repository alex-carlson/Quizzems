import { writable } from 'svelte/store';
import { supabase, getSession } from '$lib/api/supabaseClient';
import { fetchUser } from '$lib/api/user';
import { browser } from '$app/environment';

// Define user type
export interface User {
  id: string;
  public_id: string;
  username: string;
  bio?: string;
  email?: string;
  uid?: string;
  token?: string | null;
  profilePictureUrl?: string;
  quizzes_completed?: { quizId: number; score: number }[]
}

export const user = writable<User | null>(null);

// Internal helper to merge profile data with session user
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchUserProfile(sessionUser: { id: string; email?: string; user_metadata?: any;[key: string]: any }, token: string | null = null): Promise<User | null> {
  if (!sessionUser) {
    console.error('No session user provided');
    return null;
  }

  try {
    let userWithProfile = await fetchUser(sessionUser.id);

    // If no profile found, wait a bit and try again (profile might be being created)
    if (!userWithProfile) {
      console.log('No user profile found, waiting 1 second and retrying...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      userWithProfile = await fetchUser(sessionUser.id);
    }    // If still no profile, create a fallback user object with basic info
    if (!userWithProfile) {
      console.warn('No user profile found after retry, creating fallback user object');
      return {
        id: sessionUser.id as string,
        public_id: sessionUser.id as string,
        username: sessionUser.user_metadata?.username || sessionUser.email?.split('@')[0] || 'User',
        bio: '',
        email: sessionUser.email as string,
        uid: sessionUser.id as string,
        token,
        profilePictureUrl: generateProfilePictureUrl(sessionUser.id as string),
      };
    } return {
      ...sessionUser,
      bio: userWithProfile.bio || '',
      username: userWithProfile.username || '',
      token,
      id: userWithProfile.id || sessionUser.id,
      public_id: userWithProfile.public_id || sessionUser.public_id,
      uid: userWithProfile.public_id || sessionUser.public_id, // For backward compatibility
      email: sessionUser.email as string,
      profilePictureUrl: generateProfilePictureUrl(userWithProfile.id || sessionUser.id),
      quizzes_completed: userWithProfile.quizzes_completed
    };
  } catch (error) {
    console.error('Error fetching user profile:', error);
    // Return fallback user object even on error
    return {
      id: sessionUser.id as string,
      public_id: sessionUser.id as string,
      username: sessionUser.user_metadata?.username || sessionUser.email?.split('@')[0] || 'User',
      bio: '',
      email: sessionUser.email as string,
      uid: sessionUser.id as string,
      token,
      profilePictureUrl: generateProfilePictureUrl(sessionUser.id as string),
    };
  }
}

// Initialize auth state on app load with error handling
let authInitialized = false;
async function initializeAuth() {
  if (!browser || authInitialized) return;
  authInitialized = true;

  try {
    const session = await getSession();
    if (session?.user) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const userWithProfile = await fetchUserProfile(session.user as any, session.access_token);
      user.set(userWithProfile);
    }
  } catch (error) {
    console.error('Error initializing auth:', error);
    user.set(null);
  }
}

// Initialize on store creation
initializeAuth();

// Helper function to get current user safely (for use in other modules)
export function getCurrentUserFromStore(): User | null {
  let currentUser: User | null = null;
  user.subscribe(value => {
    currentUser = value;
  })();
  return currentUser;
}

// Throttle auth state changes to prevent excessive updates
let authChangeTimeout: number | null = null;
let authStateChangeSubscription: any = null;

// Listen for Supabase auth state changes with throttling
if (browser && !authStateChangeSubscription) {
  authStateChangeSubscription = supabase.auth.onAuthStateChange(async (event, session) => {
    console.log('Auth state changed:', event);

    // Throttle auth state changes
    if (authChangeTimeout) {
      clearTimeout(authChangeTimeout);
    }

    authChangeTimeout = window.setTimeout(async () => {
      try {
        if (event === 'SIGNED_OUT' || !session?.user) {
          user.set(null);
          return;
        }

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const userWithProfile = await fetchUserProfile(session.user as any, session.access_token);
          user.set(userWithProfile);
        }
      } catch (error) {
        console.error('Error handling auth state change:', error);
      } finally {
        authChangeTimeout = null;
      }
    }, 100); // 100ms throttle
  });
}

// Cleanup function for auth subscriptions
export function cleanupAuthSubscriptions() {
  if (authChangeTimeout) {
    clearTimeout(authChangeTimeout);
    authChangeTimeout = null;
  }
  if (authStateChangeSubscription) {
    authStateChangeSubscription.data?.subscription?.unsubscribe?.();
    authStateChangeSubscription = null;
  }
}

// Log out and clear the store
export async function logOutUser() {
  try {
    // Always clear the user store immediately
    user.set(null);

    // Clear auth-related storage
    const clearAuthStorage = () => {
      if (browser) {
        localStorage.removeItem('user');

        // Clear all Supabase auth keys
        Object.keys(localStorage).forEach((key) => {
          if (key.startsWith('sb-') || key.includes('supabase') || key.includes('auth')) {
            localStorage.removeItem(key);
          }
        });

        Object.keys(sessionStorage).forEach((key) => {
          if (key.startsWith('sb-') || key.includes('supabase') || key.includes('auth')) {
            sessionStorage.removeItem(key);
          }
        });
      }
    };

    // Sign out from Supabase
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error during sign out:', error.message);
    }

    // Clear storage regardless of sign out success
    clearAuthStorage();

    // Redirect to login page
    if (browser) {
      window.location.href = '/login';
    }
  } catch (err) {
    console.error('Exception during logOutUser:', err);
    // Still clear local state even if sign out fails
    user.set(null);
    if (browser) {
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
  }
}

// Profile update helpers
export async function setUserBio(userId: string, bio: string) {
  if (!userId) {
    console.error('No userId provided');
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({ bio })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating bio:', error.message);
      return null;
    }

    // Update the current user store if this is the current user
    user.update(currentUser => {
      if (currentUser && currentUser.id === userId) {
        return { ...currentUser, bio };
      }
      return currentUser;
    });

    return data;
  } catch (error) {
    console.error('Error updating bio:', error);
    return null;
  }
}

export async function setUserDisplayName(userId: string, displayName: string) {
  if (!userId) {
    console.error('No userId provided');
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({ username: displayName })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating username:', error.message);
      return null;
    }

    // Update the current user store if this is the current user
    user.update(currentUser => {
      if (currentUser && currentUser.id === userId) {
        return { ...currentUser, username: displayName };
      }
      return currentUser;
    });

    return data;
  } catch (error) {
    console.error('Error updating username:', error);
    return null;
  }
}

// Update profile picture URL
export function updateProfilePictureUrl(userId: string) {
  user.update(currentUser => {
    if (currentUser) {
      return {
        ...currentUser,
        profilePictureUrl: generateProfilePictureUrl(userId)
      };
    }
    return currentUser;
  });
}

// Helper function to generate profile picture URL
function generateProfilePictureUrl(userId: string): string {
  const baseUrl = import.meta.env.VITE_SUPABASE_URL;
  const bucketName = 'profilepictures';
  return userId
    ? `${baseUrl}/storage/v1/object/public/${bucketName}/${userId}/avatar.jpg`
    : '/avatar.png';
}
