import { create } from "zustand";
import Cookies from "js-cookie";

// Siguraduhin na ito ang sakto sa binabalik ng backend mo
interface UserData {
  id: string;
  username: string;
  role?: string;
  department?: string;
  name: string;
}

interface AuthState {
  user: UserData | null;
  setAuth: (user: UserData) => void;
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

  logout: () => {
    Cookies.remove("user");
    Cookies.remove("token");
    set({ user: null });
  },
}));