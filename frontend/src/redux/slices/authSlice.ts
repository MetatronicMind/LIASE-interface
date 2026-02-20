import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import authService, { LoginRequest, RegisterRequest, AuthResponse } from '@/services/authService';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  roleDisplayName?: string;
  organizationId: string;
  permissions?: Record<string, Record<string, boolean>>;
}

export interface Organization {
  id: string;
  name: string;
  plan: string;
  settings?: any;
}

interface AuthState {
  user: User | null;
  organization: Organization | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  passwordWarning: boolean;
}

const initialState: AuthState = {
  user: null,
  organization: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  passwordWarning: false,
};

// Async thunks
export const loginUser = createAsyncThunk(
  'auth/login',
  async (credentials: LoginRequest, { rejectWithValue }) => {
    try {
      const response = await authService.login(credentials);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Login failed');
    }
  }
);

export const registerOrganization = createAsyncThunk(
  'auth/register',
  async (data: RegisterRequest, { rejectWithValue }) => {
    try {
      const response = await authService.register(data);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Registration failed');
    }
  }
);

export const refreshAuthToken = createAsyncThunk(
  'auth/refreshToken',
  async (_, { rejectWithValue }) => {
    try {
      const token = await authService.refreshToken();
      return { token };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Token refresh failed');
    }
  }
);

export const logoutUser = createAsyncThunk(
  'auth/logout',
  async () => {
    await authService.logout();
  }
);

export const checkAuthStatus = createAsyncThunk(
  'auth/checkStatus',
  async (_, { rejectWithValue }) => {
    try {
      if (!authService.isAuthenticated()) {
        throw new Error('Not authenticated');
      }

      const token = await authService.ensureValidToken();
      if (!token) {
        throw new Error('Invalid token');
      }

      // Fetch fresh user data (including latest role permissions) from backend
      const freshData = await authService.fetchCurrentUser();
      const user = freshData?.user ?? authService.getUser();
      const organization = freshData?.organization ?? authService.getOrganization();

      return {
        user,
        organization,
        token,
      };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Authentication check failed');
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCredentials: (state, action: PayloadAction<AuthResponse>) => {
      state.user = action.payload.user;
      state.organization = action.payload.organization;
      state.token = action.payload.token;
      state.isAuthenticated = true;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.organization = action.payload.organization;
        state.token = action.payload.token;
        state.isAuthenticated = true;
        state.error = null;
        state.passwordWarning = !!action.payload.passwordWarning;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        state.isAuthenticated = false;
        state.user = null;
        state.organization = null;
        state.token = null;
      })
      // Register
      .addCase(registerOrganization.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(registerOrganization.fulfilled, (state) => {
        state.isLoading = false;
        state.error = null;
        // Don't auto-login after registration, redirect to login page
      })
      .addCase(registerOrganization.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Refresh token
      .addCase(refreshAuthToken.fulfilled, (state, action) => {
        state.token = action.payload.token;
      })
      .addCase(refreshAuthToken.rejected, (state) => {
        state.user = null;
        state.organization = null;
        state.token = null;
        state.isAuthenticated = false;
      })
      // Check auth status
      .addCase(checkAuthStatus.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.organization = action.payload.organization;
        state.token = action.payload.token;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(checkAuthStatus.rejected, (state) => {
        state.user = null;
        state.organization = null;
        state.token = null;
        state.isAuthenticated = false;
      })
      // Logout
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.organization = null;
        state.token = null;
        state.isAuthenticated = false;
        state.error = null;
      });
  },
});

export const { clearError, setCredentials } = authSlice.actions;
export default authSlice.reducer;