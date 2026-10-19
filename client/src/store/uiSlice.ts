import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface UIState {
  sidebarCollapsed: boolean;
  isCommandPaletteOpen: boolean;
  isNotificationDrawerOpen: boolean;
  isQuickAddOpen: boolean;
  quickAddType: 'document' | 'assignment' | 'exam' | 'note' | 'semester' | 'course';
  searchQuery: string;
  debouncedSearchQuery: string;
  documentViewMode: 'grid' | 'list';
  documentSortBy: 'name' | 'date' | 'size' | 'category';
  documentSortOrder: 'asc' | 'desc';
}

const initialState: UIState = {
  sidebarCollapsed: false,
  isCommandPaletteOpen: false,
  isNotificationDrawerOpen: false,
  isQuickAddOpen: false,
  quickAddType: 'document',
  searchQuery: '',
  debouncedSearchQuery: '',
  documentViewMode: 'grid',
  documentSortBy: 'date',
  documentSortOrder: 'desc',
};

export const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setSidebarCollapsed: (state, action: PayloadAction<boolean>) => {
      state.sidebarCollapsed = action.payload;
    },
    toggleSidebarCollapsed: (state) => {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    setCommandPaletteOpen: (state, action: PayloadAction<boolean>) => {
      state.isCommandPaletteOpen = action.payload;
    },
    setNotificationDrawerOpen: (state, action: PayloadAction<boolean>) => {
      state.isNotificationDrawerOpen = action.payload;
    },
    setQuickAddOpen: (
      state,
      action: PayloadAction<{ isOpen: boolean; type?: UIState['quickAddType'] }>
    ) => {
      state.isQuickAddOpen = action.payload.isOpen;
      if (action.payload.type) {
        state.quickAddType = action.payload.type;
      }
    },
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
    setDebouncedSearchQuery: (state, action: PayloadAction<string>) => {
      state.debouncedSearchQuery = action.payload;
    },
    setDocumentViewMode: (state, action: PayloadAction<'grid' | 'list'>) => {
      state.documentViewMode = action.payload;
    },
    setDocumentSorting: (
      state,
      action: PayloadAction<{
        sortBy: UIState['documentSortBy'];
        sortOrder: UIState['documentSortOrder'];
      }>
    ) => {
      state.documentSortBy = action.payload.sortBy;
      state.documentSortOrder = action.payload.sortOrder;
    },
  },
});

export const {
  setSidebarCollapsed,
  toggleSidebarCollapsed,
  setCommandPaletteOpen,
  setNotificationDrawerOpen,
  setQuickAddOpen,
  setSearchQuery,
  setDebouncedSearchQuery,
  setDocumentViewMode,
  setDocumentSorting,
} = uiSlice.actions;

export default uiSlice.reducer;
