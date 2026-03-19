/**
 * Login page — branded landing page with "Sign in with Microsoft" button.
 *
 * This is the entry point for unauthenticated users. Clicking the button
 * initiates the Microsoft Entra OAuth flow via GET /v1/auth/login.
 *
 * Also shown when a session expires or auth fails (?error=auth_failed).
 */

import { useSearchParams } from "react-router-dom";
import { config } from "@/lib/config";

const LOGIN_URL = config.apiBaseUrl
  ? `${config.apiBaseUrl}/v1/auth/login`
  : "/v1/auth/login";

export function LoginPage() {
  const [searchParams] = useSearchParams();
  const error = searchParams.get("error");

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-900 px-4">
      {/* Card + footer — vertically centered, logo sits above card */}
      <div className="flex flex-1 flex-col items-center justify-center gap-4">
        <img
          src="/src/assets/logo-color.png"
          alt="ADT Hub"
          className="h-40 w-auto -mt-24"
        />
        <div className="w-full max-w-md">
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-7">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white text-center mb-1">
              Welcome to ADT Hub
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
              Sign in with your At Dawn Microsoft account to continue.
            </p>

            {/* Error message */}
            {error === "auth_failed" && (
              <div className="mb-4 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-3 py-2.5">
                <p className="text-xs text-red-700 dark:text-red-400">
                  Sign in failed. Please try again.
                </p>
              </div>
            )}

            {/* Sign in with Microsoft button */}
            <a
              href={LOGIN_URL}
              aria-label="Sign in with Microsoft"
              className="flex w-full items-center justify-center gap-3 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              {/* Microsoft logo */}
              <svg width="20" height="20" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg">
                <rect x="1" y="1" width="9" height="9" fill="#f25022" />
                <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
                <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
                <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
              </svg>
              Sign in with Microsoft
            </a>
          </div>

          <p className="mt-6 text-center text-xs text-gray-400 dark:text-gray-500">
            Access is restricted to At Dawn employees.
          </p>
        </div>
      </div>
    </div>
  );
}
