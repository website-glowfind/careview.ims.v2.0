import axios from "axios";
import { useAuthStore } from "../store/authStore";

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "/api/v1",
    withCredentials: true,
});

api.interceptors.request.use((config) => {
    return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);

export default api;
