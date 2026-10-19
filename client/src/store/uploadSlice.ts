import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type UploadStatus =
  | 'selected'
  | 'uploading'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface UploadTaskMetadata {
  id: string;
  filename: string;
  size: number;
  mimeType: string;
  category: string;
  semesterId?: string;
  courseId?: string;
  description?: string;
  tags?: string[];
  progress: number; // 0 to 100 honest progress
  status: UploadStatus;
  errorMessage?: string;
  startedAt: number;
  completedAt?: number;
}

export interface UploadState {
  tasks: Record<string, UploadTaskMetadata>;
  isUploadModalOpen: boolean;
  activeUploadCount: number;
}

const initialState: UploadState = {
  tasks: {},
  isUploadModalOpen: false,
  activeUploadCount: 0,
};

export const uploadSlice = createSlice({
  name: 'upload',
  initialState,
  reducers: {
    setUploadModalOpen: (state, action: PayloadAction<boolean>) => {
      state.isUploadModalOpen = action.payload;
    },
    addUploadTask: (state, action: PayloadAction<UploadTaskMetadata>) => {
      state.tasks[action.payload.id] = action.payload;
      if (action.payload.status === 'uploading' || action.payload.status === 'processing') {
        state.activeUploadCount += 1;
      }
    },
    updateUploadProgress: (
      state,
      action: PayloadAction<{ id: string; progress: number; status?: UploadStatus }>
    ) => {
      const task = state.tasks[action.payload.id];
      if (task) {
        task.progress = action.payload.progress;
        if (action.payload.status) {
          task.status = action.payload.status;
        }
      }
    },
    setUploadStatus: (
      state,
      action: PayloadAction<{
        id: string;
        status: UploadStatus;
        errorMessage?: string;
      }>
    ) => {
      const task = state.tasks[action.payload.id];
      if (task) {
        const wasActive = task.status === 'uploading' || task.status === 'processing';
        task.status = action.payload.status;
        if (action.payload.errorMessage) {
          task.errorMessage = action.payload.errorMessage;
        }
        if (action.payload.status === 'completed') {
          task.progress = 100;
          task.completedAt = Date.now();
        }
        const isNowActive =
          action.payload.status === 'uploading' || action.payload.status === 'processing';
        if (wasActive && !isNowActive) {
          state.activeUploadCount = Math.max(0, state.activeUploadCount - 1);
        } else if (!wasActive && isNowActive) {
          state.activeUploadCount += 1;
        }
      }
    },
    removeUploadTask: (state, action: PayloadAction<string>) => {
      const task = state.tasks[action.payload];
      if (task && (task.status === 'uploading' || task.status === 'processing')) {
        state.activeUploadCount = Math.max(0, state.activeUploadCount - 1);
      }
      delete state.tasks[action.payload];
    },
    clearCompletedUploads: (state) => {
      Object.keys(state.tasks).forEach((id) => {
        const task = state.tasks[id];
        if (task.status === 'completed' || task.status === 'cancelled') {
          delete state.tasks[id];
        }
      });
    },
  },
});

export const {
  setUploadModalOpen,
  addUploadTask,
  updateUploadProgress,
  setUploadStatus,
  removeUploadTask,
  clearCompletedUploads,
} = uploadSlice.actions;

export default uploadSlice.reducer;
