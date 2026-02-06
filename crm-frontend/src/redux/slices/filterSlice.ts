import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface FilterState {
  selectedOrganizationId: string | null;
}

const initialState: FilterState = {
  selectedOrganizationId: null,
};

export const filterSlice = createSlice({
  name: 'filter',
  initialState,
  reducers: {
    setSelectedOrganizationId: (state, action: PayloadAction<string | null>) => {
      state.selectedOrganizationId = action.payload;
    },
  },
});

export const { setSelectedOrganizationId } = filterSlice.actions;
export default filterSlice.reducer;
