import { Toaster as SonnerToaster } from "sonner";

export const Toaster = () => (
  <SonnerToaster
    position="bottom-center"
    toastOptions={{
      style: {
        background: "#0d1726",
        border: "1px solid rgba(255,255,255,0.1)",
        color: "#e2e8f0",
        borderRadius: "16px",
        padding: "12px 16px",
        fontSize: "14px",
        boxShadow:
          "0 22px 60px rgba(0,0,0,0.72), 0 0 0 1px rgba(255,255,255,0.06)",
      },
    }}
    closeButton
    richColors
  />
);
