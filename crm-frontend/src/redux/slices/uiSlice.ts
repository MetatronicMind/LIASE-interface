import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UIState {
  isSidebarLocked: boolean;
}

const initialState: UIState = {
  isSidebarLocked: false,
};

export const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setSidebarLocked: (state, action: PayloadAction<boolean>) => {
      state.isSidebarLocked = action.payload;
    },
  },
});

export const { setSidebarLocked } = uiSlice.actions;

export default uiSlice.reducer;
