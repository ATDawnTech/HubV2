/**
 * Auth callback page — exchanges the one-time code for a JWT.
 *
 * The backend redirects here after a successful Microsoft login with
 * ?code=<one-time-code>. This page POSTs the code to POST /v1/auth/token,
 * stores the JWT in localStorage, then redirects to the dashboard.
 *
 * On failure it redirects to /login?error=auth_failed.
 */

import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { apiClient } from "@/lib/axios";

interface TokenResponse {
  data: { token: string; token_type: string; expires_in: number };
  meta: null;
  error: null;
}

export function AuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const called = useRef(false);

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    const code = searchParams.get("code");

    if (!code) {
      navigate("/login?error=auth_failed", { replace: true });
      return;
    }

    apiClient
      .post<TokenResponse>("/v1/auth/token", { code })
      .then((res) => {
        const { token } = res.data.data;
        localStorage.setItem("adthub_token", token);

        // Parse employee ID from JWT payload
        try {
          const payload = JSON.parse(atob(token.split(".")[1]!));
          if (payload.sub) {
            localStorage.setItem("adthub_employee_id", payload.sub);
          }
        } catch {
          // non-fatal — employee ID will be backfilled by useAuth
        }

        navigate("/", { replace: true });
      })
      .catch(() => {
        navigate("/login?error=auth_failed", { replace: true });
      });
  }, [searchParams, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <img
          src="/src/assets/logo-color.png"
          alt="ADT Hub"
          className="mx-auto mb-6 h-12 w-auto"
        />
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Completing sign in…
        </p>
      </div>
    </div>
  );
}
