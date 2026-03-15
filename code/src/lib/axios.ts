/**
 * Pre-configured Axios instance for all ADT Hub API calls.
 *
 * Sets the base URL from config and attaches the JWT from localStorage on
 * every request via a request interceptor. Clears auth and redirects to
 * /login on 401 responses.
 */

import axios from "axios";
import { config } from "./config";

export const apiClient = axios.create({
  baseURL: config.apiBaseUrl,
  headers: {
    "Content-Type": "application/json",
  },
  // FastAPI expects repeated params for arrays: status=active&status=new_onboard
  // Axios default uses brackets (status[]=active) which FastAPI ignores.
  paramsSerializer: { indexes: null },
});

apiClient.interceptors.request.use((req) => {
  const token = localStorage.getItem("adthub_token");
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }
  return req;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      localStorage.removeItem("adthub_token");
      if (config.environment === "local") {
        // In local dev, reload so useAuth re-fetches the dev token automatically
        // instead of redirecting to a login page that doesn't exist yet.
        window.location.reload();
      } else {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);
