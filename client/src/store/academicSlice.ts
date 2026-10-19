import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface StudyTimerState {
  isActive: boolean;
  isPaused: boolean;
  studyPlanId?: string;
  courseId?: string;
  semesterId?: string;
  startTime?: number; // epoch ms
  elapsedSeconds: number;
  durationMinutes: number;
}

export interface AcademicClientState {
  selectedSemesterId: string | null;
  selectedCourseId: string | null;
  timer: StudyTimerState;
}

const initialState: AcademicClientState = {
  selectedSemesterId: null,
  selectedCourseId: null,
  timer: {
    isActive: false,
    isPaused: false,
    elapsedSeconds: 0,
    durationMinutes: 25,
  },
};

export const academicSlice = createSlice({
  name: 'academic',
  initialState,
  reducers: {
    setSelectedSemesterId: (state, action: PayloadAction<string | null>) => {
      state.selectedSemesterId = action.payload;
    },
    setSelectedCourseId: (state, action: PayloadAction<string | null>) => {
      state.selectedCourseId = action.payload;
    },
    startStudyTimer: (
      state,
      action: PayloadAction<{
        studyPlanId?: string;
        courseId?: string;
        semesterId?: string;
        durationMinutes?: number;
      }>
    ) => {
      state.timer.isActive = true;
      state.timer.isPaused = false;
      state.timer.startTime = Date.now();
      state.timer.elapsedSeconds = 0;
      state.timer.studyPlanId = action.payload.studyPlanId;
      state.timer.courseId = action.payload.courseId;
      state.timer.semesterId = action.payload.semesterId;
      if (action.payload.durationMinutes) {
        state.timer.durationMinutes = action.payload.durationMinutes;
      }
    },
    pauseStudyTimer: (state) => {
      state.timer.isPaused = true;
    },
    resumeStudyTimer: (state) => {
      state.timer.isPaused = false;
    },
    tickStudyTimer: (state, action: PayloadAction<number>) => {
      state.timer.elapsedSeconds += action.payload;
    },
    resetStudyTimer: (state) => {
      state.timer.isActive = false;
      state.timer.isPaused = false;
      state.timer.startTime = undefined;
      state.timer.elapsedSeconds = 0;
      state.timer.studyPlanId = undefined;
    },
  },
});

export const {
  setSelectedSemesterId,
  setSelectedCourseId,
  startStudyTimer,
  pauseStudyTimer,
  resumeStudyTimer,
  tickStudyTimer,
  resetStudyTimer,
} = academicSlice.actions;

export default academicSlice.reducer;
