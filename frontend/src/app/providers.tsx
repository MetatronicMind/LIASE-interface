"use client";
import { Provider } from "react-redux";
import { store } from "@/redux/store";
import AuthWrapper from "@/components/AuthWrapper";
import { PermissionProvider } from "@/components/PermissionProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <AuthWrapper>
        <PermissionProvider>
          {children}
        </PermissionProvider>
      </AuthWrapper>
    </Provider>
  );
}
