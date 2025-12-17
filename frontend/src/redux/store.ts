import { configureStore } from '@reduxjs/toolkit';
import counterReducer from './slices/counterSlice';
import authReducer from './slices/authSlice';
import dateTimeReducer from './slices/dateTimeSlice';
import filterReducer from './slices/filterSlice';

export const store = configureStore({
  reducer: {
    counter: counterReducer,
    auth: authReducer,
    dateTime: dateTimeReducer,
    filter: filterReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
