import { configureStore } from '@reduxjs/toolkit';
import uiReducer from './uiSlice';
import uploadReducer from './uploadSlice';
import academicReducer from './academicSlice';

export const store = configureStore({
  reducer: {
    ui: uiReducer,
    upload: uploadReducer,
    academic: academicReducer,
  },
  devTools: import.meta.env.DEV,
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
