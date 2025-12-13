"use client";
import { Provider } from "react-redux";
import { store } from "@/redux/store";
import AuthWrapper from "@/components/AuthWrapper";
import { PermissionProvider } from "@/components/PermissionProvider";
import { Toaster } from "react-hot-toast";
import DateTimeInitializer from "@/components/DateTimeInitializer";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <DateTimeInitializer />
      <AuthWrapper>
        <PermissionProvider>
          {children}
          <Toaster position="top-right" />
        </PermissionProvider>
      </AuthWrapper>
    </Provider>
  );
}
