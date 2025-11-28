import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000/api";

const api = axios.create({
    baseURL: API_URL,
    timeout: 60000,
});

// Attach Authorization header if token exists
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("access_token");
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Basic response handler
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        // Centralize error shape
        const status = error?.response?.status;
        const data = error?.response?.data;

        // Example: handle unauthorized
        if (status === 401) {
            // Optional: redirect to login or clear storage
            // localStorage.removeItem("access_token");
            // window.location.href = "/login";
        }

        return Promise.reject({ status, data, message: error.message });
    }
);

export default api;