import axios from "axios";

/**
 * Extracts a human-readable error message from an Axios error response,
 * falling back to a provided default string.
 *
 * Expects the API envelope shape: { error: { message: string } }
 */
export function getAxiosErrorMessage(error: unknown, fallback: string): string {
  if (
    axios.isAxiosError(error) &&
    error.response?.data?.error?.message
  ) {
    return error.response.data.error.message as string;
  }
  return fallback;
}
