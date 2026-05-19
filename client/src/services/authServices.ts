import api from "./api";
import { useAuthStore } from "../store/authStore";
import axios from "axios";

export const loginService = async (username: string, password: string) => {
    try {
        const response = await api.post("/users/login", { username, password });
        
        const { user } = response.data;
        useAuthStore.getState().setAuth(user);

        return { success: true, data: user };
    
    } catch (error: any) {
        if (axios.isAxiosError(error)) {
            const errorMessage = error.response?.data?.error || "An unexpected error occurred";
            throw new Error(errorMessage);
        } else {
            throw new Error("An unknown error occurred");
        }
    }
};

export const logoutService = async () => {
    try {
        await api.post("/users/logout");
    } catch (error) {
        console.error("Logout error:", error);
    } finally {
        useAuthStore.getState().logout();
        window.location.href = "/login";
    }
};

export const getLoggedInUser = () => {
    // Kinukuha lang nito ang current user sa Zustand (na galing sa Cookies.get('user'))
    return useAuthStore.getState().user;
};