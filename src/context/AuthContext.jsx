import { createContext, useContext, useEffect, useState } from "react";
import {
  createUserWithEmailAndPassword,
  onIdTokenChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from "firebase/auth";
import { api, setAccessToken } from "../api/client";
import { firebaseAuth, googleProvider } from "../firebase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const unsubscribe = onIdTokenChanged(
      firebaseAuth,
      async (firebaseUser) => {
        if (!mounted) return;

        try {
          if (!firebaseUser) {
            setAccessToken(null);
            setUser(null);
            setLoading(false);
            return;
          }

          // Always get a fresh Firebase ID token.
          const freshToken = await firebaseUser.getIdToken(true);

          if (!mounted) return;

          setAccessToken(freshToken);

          // Sync the Firebase user with the local MongoDB user.
          const res = await api.firebaseLogin(freshToken);

          if (!mounted) return;

          setUser(res.data.user);
        } catch (error) {
          console.error("Authentication session error:", error);

          if (!mounted) return;

          setAccessToken(null);
          setUser(null);
        } finally {
          if (mounted) {
            setLoading(false);
          }
        }
      }
    );

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  // Exchanges the current Firebase user's fresh ID token
  // for the synced local user record.
  async function syncSession() {
    const firebaseUser = firebaseAuth.currentUser;

    if (!firebaseUser) {
      throw new Error("No Firebase user is currently signed in.");
    }

    const idToken = await firebaseUser.getIdToken(true);

    setAccessToken(idToken);

    const res = await api.firebaseLogin(idToken);

    setUser(res.data.user);

    return res;
  }

  // Email/password login.
  // The user must verify their email before they can sign in.
  async function login(email, password) {
    const cred = await signInWithEmailAndPassword(
      firebaseAuth,
      email,
      password
    );

    if (!cred.user.emailVerified) {
      await signOut(firebaseAuth);

      throw new Error(
        "Please verify your email before signing in. Check your inbox for the verification link."
      );
    }

    return syncSession();
  }

  // Google login.
  async function loginWithGoogle() {
    await signInWithPopup(firebaseAuth, googleProvider);

    return syncSession();
  }

  // Create a new email/password account.
  async function register({ email, password, fullName }) {
    const cred = await createUserWithEmailAndPassword(
      firebaseAuth,
      email,
      password
    );

    if (fullName) {
      await updateProfile(cred.user, {
        displayName: fullName,
      });
    }

    await sendEmailVerification(cred.user);

    // Do not keep the new account signed in.
    await signOut(firebaseAuth);

    return { success: true };
  }

  // Send password reset email.
  async function forgotPassword(email) {
    return sendPasswordResetEmail(firebaseAuth, email);
  }

  // Logout from Planora and Firebase.
  async function logout() {
    try {
      await api.logout();
    } catch {
      // Ignore network errors during logout.
    }

    await signOut(firebaseAuth);

    setAccessToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        loginWithGoogle,
        register,
        forgotPassword,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}