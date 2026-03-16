import { RouterProvider } from "react-router-dom";
import { Toaster } from "sonner";
import { router } from "@/lib/router";
import { NotificationProvider } from "@/context/NotificationContext";

export function App(): JSX.Element {
  return (
    <>
      <NotificationProvider>
        <RouterProvider router={router} />
      </NotificationProvider>
      <Toaster position="bottom-right" richColors />
    </>
  );
}
