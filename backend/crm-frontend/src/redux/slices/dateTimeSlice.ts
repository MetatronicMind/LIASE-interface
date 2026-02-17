import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { DateTimeSettings } from '@/utils/dateTimeFormatter';

interface DateTimeState {
  settings: DateTimeSettings;
  loading: boolean;
  error: string | null;
}

const initialState: DateTimeState = {
  settings: {
    dateFormat: 'DD-MMM-YYYY',
    timeFormat: '24h',
    timezone: 'Local',
    showTimezone: true,
    showSeconds: false,
  },
  loading: false,
  error: null,
};

const dateTimeSlice = createSlice({
  name: 'dateTime',
  initialState,
  reducers: {
    setDateTimeSettings: (state, action: PayloadAction<DateTimeSettings>) => {
      state.settings = action.payload;
      state.error = null;
    },
    updateDateFormat: (state, action: PayloadAction<string>) => {
      state.settings.dateFormat = action.payload as any;
    },
    updateTimeFormat: (state, action: PayloadAction<'24h' | '12h'>) => {
      state.settings.timeFormat = action.payload;
    },
    updateTimezone: (state, action: PayloadAction<string>) => {
      state.settings.timezone = action.payload;
    },
    toggleShowTimezone: (state) => {
      state.settings.showTimezone = !state.settings.showTimezone;
    },
    toggleShowSeconds: (state) => {
      state.settings.showSeconds = !state.settings.showSeconds;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

export const {
  setDateTimeSettings,
  updateDateFormat,
  updateTimeFormat,
  updateTimezone,
  toggleShowTimezone,
  toggleShowSeconds,
  setLoading,
  setError,
} = dateTimeSlice.actions;

export default dateTimeSlice.reducer;
