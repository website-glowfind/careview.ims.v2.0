import { create } from "zustand";
import Cookies from "js-cookie";

// Siguraduhin na ito ang sakto sa binabalik ng backend mo
interface UserData {
  id: string;
  username: string;
  role?: string;
  department?: string;
  name: string;
  email?: string;
  status?: 'active' | 'inactive';
  permissions?: Record<string, string[]>;
  mustChangePassword?: boolean;
}

interface AuthState {
  user: UserData | null;
  setAuth: (user: UserData) => void;
  patchUser: (partial: Partial<UserData>) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: Cookies.get("user") ? JSON.parse(Cookies.get("user")!) : null,

  setAuth: (userData: UserData) => {
    Cookies.set("user", JSON.stringify(userData), { 
      expires: 1, 
      secure: false,
      sameSite: 'lax' 
    });
    set({ user: userData });
    console.log("User data set in Zustand and cookie:", userData);
  },

  patchUser: (partial: Partial<UserData>) => {
    const current = useAuthStore.getState().user;
    if (!current) return;
    const merged = { ...current, ...partial };
    try { Cookies.set("user", JSON.stringify(merged), { expires: 1, secure: false, sameSite: 'lax' }); } catch { /* ignore */ }
    set({ user: merged });
  },

  logout: () => {
    Cookies.remove("user");
    Cookies.remove("token");
    set({ user: null });
  },
}));