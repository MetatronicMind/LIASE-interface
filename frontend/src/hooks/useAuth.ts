import { useSelector, useDispatch } from 'react-redux';
import { useCallback } from 'react';
import { RootState, AppDispatch } from '@/redux/store';
import { 
  loginUser, 
  registerOrganization, 
  logoutUser, 
  clearError, 
  checkAuthStatus,
  refreshAuthToken 
} from '@/redux/slices/authSlice';
import { LoginRequest, RegisterRequest } from '@/services/authService';

export const useAuth = () => {
  const dispatch = useDispatch<AppDispatch>();
  const {
    user,
    organization,
    isAuthenticated,
    isLoading,
    error,
    passwordWarning,
  } = useSelector((state: RootState) => state.auth);

  const login = useCallback(async (credentials: LoginRequest) => {
    const result = await dispatch(loginUser(credentials));
    return result;
  }, [dispatch]);

  const register = useCallback(async (data: RegisterRequest) => {
    const result = await dispatch(registerOrganization(data));
    return result;
  }, [dispatch]);

  const signOut = useCallback(async () => {
    const result = await dispatch(logoutUser());
    return result;
  }, [dispatch]);

  const clearAuthError = useCallback(() => {
    dispatch(clearError());
  }, [dispatch]);

  const checkAuth = useCallback(async () => {
    const result = await dispatch(checkAuthStatus());
    return result;
  }, [dispatch]);

  const refreshToken = useCallback(async () => {
    const result = await dispatch(refreshAuthToken());
    return result;
  }, [dispatch]);

  return {
    // State
    user,
    organization,
    isAuthenticated,
    isLoading,
    error,
    passwordWarning,
    
    // Actions
    login,
    register,
    logout: signOut,
    clearError: clearAuthError,
    checkAuth,
    refreshToken,
  };
};

export default useAuth;