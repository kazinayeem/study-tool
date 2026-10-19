import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  GraduationCap,
  LayoutDashboard,
  BookOpen,
  CalendarDays,
  Sparkles,
  Settings,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Award,
  Layers,
  ChevronRight,
  TrendingUp,
  Info,
  Calendar,
  AlertCircle,
  Plus,
} from 'lucide-react';
import { api } from '../../lib/api';
import { DegreeProgressData, CurriculumCourse } from '../../types';
import { CurriculumTable } from './components/CurriculumTable';
import { SemesterCreditHistory } from './components/SemesterCreditHistory';
import { NextSemesterPlanner } from './components/NextSemesterPlanner';
import { DegreeSetupModal } from './components/DegreeSetupModal';
import { AddCourseModal } from './components/AddCourseModal';

export const DegreePlannerPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'CURRICULUM' | 'HISTORY' | 'PLANNER' | 'SETUP'>('OVERVIEW');

  // Modal states
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);
  const [isAddCourseModalOpen, setIsAddCourseModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<CurriculumCourse | null>(null);

  // Queries
  const {
    data: progressData,
    isLoading: isProgressLoading,
    refetch: refetchProgress,
  } = useQuery<DegreeProgressData>({
    queryKey: ['degreeProgress'],
    queryFn: () => api.getDegreeProgress(),
  });

  const {
    data: curriculumData,
    isLoading: isCurriculumLoading,
    refetch: refetchCurriculum,
  } = useQuery({
    queryKey: ['curriculum'],
    queryFn: () => api.getCurriculum(),
  });

  const {
    data: plannerData,
    isLoading: isPlannerLoading,
    refetch: refetchPlanner,
  } = useQuery({
    queryKey: ['nextSemesterPlanner'],
    queryFn: () => api.getNextSemesterPlanner(),
  });

  // Mutations
  const updateProgramMutation = useMutation({
    mutationFn: (data: any) => api.updateDegreeProgram(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['degreeProgress'] });
      queryClient.invalidateQueries({ queryKey: ['curriculum'] });
      queryClient.invalidateQueries({ queryKey: ['nextSemesterPlanner'] });
    },
  });

  const importMutation = useMutation({
    mutationFn: (data: any) => api.importCurriculum(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['degreeProgress'] });
      queryClient.invalidateQueries({ queryKey: ['curriculum'] });
      queryClient.invalidateQueries({ queryKey: ['nextSemesterPlanner'] });
    },
  });

  const clearCurriculumMutation = useMutation({
    mutationFn: () => api.clearCurriculum(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['degreeProgress'] });
      queryClient.invalidateQueries({ queryKey: ['curriculum'] });
      queryClient.invalidateQueries({ queryKey: ['nextSemesterPlanner'] });
    },
  });

  const saveCourseMutation = useMutation({
    mutationFn: (courseData: any) => {
      if (editingCourse) {
        return api.updateCurriculumCourse(editingCourse.id, courseData);
      }
      return api.createCurriculumCourse(courseData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['curriculum'] });
      queryClient.invalidateQueries({ queryKey: ['degreeProgress'] });
      queryClient.invalidateQueries({ queryKey: ['nextSemesterPlanner'] });
      setEditingCourse(null);
    },
  });

  const deleteCourseMutation = useMutation({
    mutationFn: (id: string) => api.deleteCurriculumCourse(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['curriculum'] });
      queryClient.invalidateQueries({ queryKey: ['degreeProgress'] });
      queryClient.invalidateQueries({ queryKey: ['nextSemesterPlanner'] });
    },
  });

  const saveScheduleMutation = useMutation({
    mutationFn: (courseIds: string[]) =>
      api.savePlannedScheduleBatch(plannerData?.targetSemesterName || 'Next Term (Planned)', courseIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nextSemesterPlanner'] });
      queryClient.invalidateQueries({ queryKey: ['degreeProgress'] });
      queryClient.invalidateQueries({ queryKey: ['curriculum'] });
    },
  });

  const isLoading = isProgressLoading || isCurriculumLoading;

  if (isLoading || !progressData) {
    return (
      <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto animate-pulse">
        <div className="h-20 bg-[#f0eeec] dark:bg-[#1f1f23] rounded-[12px]" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="h-28 bg-[#f0eeec] dark:bg-[#1f1f23] rounded-[12px]" />
          <div className="h-28 bg-[#f0eeec] dark:bg-[#1f1f23] rounded-[12px]" />
          <div className="h-28 bg-[#f0eeec] dark:bg-[#1f1f23] rounded-[12px]" />
          <div className="h-28 bg-[#f0eeec] dark:bg-[#1f1f23] rounded-[12px]" />
        </div>
        <div className="h-64 bg-[#f0eeec] dark:bg-[#1f1f23] rounded-[12px]" />
      </div>
    );
  }

  const { program, credits, courses, graduationEstimates, categoryBreakdown, semesterHistory } = progressData;
  const isCurriculumIncomplete = !progressData.isConfigured || courses.totalCurriculum === 0;

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto text-[#37352f] dark:text-[#f0eeec]">
      {/* 1. Header Banner & Identity */}
      <div className="rounded-[16px] border border-[#e5e3df] bg-[#fbfbfa] dark:border-[#2a2a2e] dark:bg-[#141416] p-5 md:p-6 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] px-2.5 py-0.5 rounded-[6px] bg-[#0a1530] text-white font-semibold flex items-center gap-1.5 shadow-2xs">
                <GraduationCap className="h-3.5 w-3.5" />
                <span>Degree Progress</span>
              </span>
              <span className="text-xs text-[#787671] dark:text-[#a4a097] font-medium">
                {program.universityName} • {program.department || 'Academic Division'}
              </span>
              {isCurriculumIncomplete ? (
                <span className="text-[10px] px-2 py-0.5 rounded-[4px] bg-[#fde0ec] text-[#e03131] font-semibold border border-[#e03131]/30">
                  ⚠️ Incomplete Curriculum
                </span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded-[4px] bg-[#d9f3e1] text-[#1aae39] font-semibold border border-[#1aae39]/30">
                  ✓ Verified Curriculum
                </span>
              )}
            </div>

            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-[#1a1a1a] dark:text-white">
              {program.programName}
            </h1>

            <p className="text-xs text-[#5d5b54] dark:text-[#a4a097]">
              Catalog Year: <strong>{program.curriculumYear || 'Current'}</strong>
              {' • '}
              Degree Goal: <strong>{credits.totalRequired} Credits</strong> ({program.degreeDurationYears || 4} Years / {program.requiredSemesters || 8} Terms)
              {' • '}
              Standard Term Load: <strong>{program.minCreditsPerSemester} – {program.maxCreditsPerSemester} cr</strong>
            </p>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsSetupModalOpen(true)}
              className="btn-notion-secondary text-xs px-3 py-1.5 flex items-center gap-1.5 cursor-pointer"
            >
              <Settings className="h-3.5 w-3.5 text-[#5645d4]" />
              <span>Program Setup & Import</span>
            </button>
            <button
              onClick={() => {
                setEditingCourse(null);
                setIsAddCourseModalOpen(true);
              }}
              className="btn-notion-primary text-xs px-3.5 py-1.5 flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Course</span>
            </button>
          </div>
        </div>

        {/* Incomplete Curriculum Callout Banner */}
        {isCurriculumIncomplete && (
          <div className="mt-4 p-3.5 rounded-[10px] bg-[#fff3e0] border border-[#f59e0b]/40 text-xs text-[#523410] dark:bg-[#2b1f09] dark:text-[#fcd34d] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fadeIn">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 text-[#dd5b00] shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold">Curriculum Data Incomplete:</strong> Your official university degree catalog has not been fully imported. Calculations currently reflect only registered course records.
              </div>
            </div>
            <button
              onClick={() => setIsSetupModalOpen(true)}
              className="text-xs font-bold text-[#5645d4] dark:text-[#8070f6] hover:underline whitespace-nowrap cursor-pointer shrink-0"
            >
              Load Curriculum Preset →
            </button>
          </div>
        )}
      </div>

      {/* 2. Main Navigation Tabs */}
      <div className="flex items-center gap-1 border-b border-[#e5e3df] dark:border-[#2a2a2e] text-xs font-medium overflow-x-auto">
        <button
          onClick={() => setActiveTab('OVERVIEW')}
          className={`flex items-center gap-2 py-3 px-4 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'OVERVIEW'
              ? 'border-[#5645d4] text-[#5645d4] font-semibold dark:border-[#8070f6] dark:text-[#8070f6]'
              : 'border-transparent text-[#787671] hover:text-[#1a1a1a] dark:text-[#a4a097]'
          }`}
        >
          <LayoutDashboard className="h-3.5 w-3.5" />
          <span>Degree Progress Dashboard</span>
        </button>

        <button
          onClick={() => setActiveTab('CURRICULUM')}
          className={`flex items-center gap-2 py-3 px-4 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'CURRICULUM'
              ? 'border-[#5645d4] text-[#5645d4] font-semibold dark:border-[#8070f6] dark:text-[#8070f6]'
              : 'border-transparent text-[#787671] hover:text-[#1a1a1a] dark:text-[#a4a097]'
          }`}
        >
          <BookOpen className="h-3.5 w-3.5" />
          <span>All Courses & Curriculum ({curriculumData?.totalCourses || courses.totalCurriculum})</span>
        </button>

        <button
          onClick={() => setActiveTab('HISTORY')}
          className={`flex items-center gap-2 py-3 px-4 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'HISTORY'
              ? 'border-[#5645d4] text-[#5645d4] font-semibold dark:border-[#8070f6] dark:text-[#8070f6]'
              : 'border-transparent text-[#787671] hover:text-[#1a1a1a] dark:text-[#a4a097]'
          }`}
        >
          <CalendarDays className="h-3.5 w-3.5" />
          <span>Semester Credit History ({semesterHistory.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('PLANNER')}
          className={`flex items-center gap-2 py-3 px-4 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'PLANNER'
              ? 'border-[#5645d4] text-[#5645d4] font-semibold dark:border-[#8070f6] dark:text-[#8070f6]'
              : 'border-transparent text-[#787671] hover:text-[#1a1a1a] dark:text-[#a4a097]'
          }`}
        >
          <Sparkles className="h-3.5 w-3.5 text-[#5645d4]" />
          <span>Next Semester Planner</span>
        </button>
      </div>

      {/* 3. TAB CONTENT */}

      {/* TAB 1: OVERVIEW DASHBOARD */}
      {activeTab === 'OVERVIEW' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Progress Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
            {/* 1. Total Required Credits */}
            <div className="p-4 rounded-[12px] border border-[#e5e3df] bg-white dark:border-[#2a2a2e] dark:bg-[#141416] shadow-2xs">
              <span className="text-[11px] font-medium text-[#787671]">Required Credits</span>
              <div className="text-2xl font-bold text-[#1a1a1a] dark:text-white mt-1">
                {credits.totalRequired}
              </div>
              <span className="text-[10px] text-[#787671]">Total Degree Goal</span>
            </div>

            {/* 2. Credits Completed */}
            <div className="p-4 rounded-[12px] border border-[#e5e3df] bg-white dark:border-[#2a2a2e] dark:bg-[#141416] shadow-2xs">
              <span className="text-[11px] font-medium text-[#1aae39]">Completed Credits</span>
              <div className="text-2xl font-bold text-[#1aae39] mt-1">
                {credits.completed}
              </div>
              <span className="text-[10px] text-[#787671] font-medium">
                {credits.completionPercentage}% of Degree
              </span>
            </div>

            {/* 3. In Progress Credits */}
            <div className="p-4 rounded-[12px] border border-[#e5e3df] bg-white dark:border-[#2a2a2e] dark:bg-[#141416] shadow-2xs">
              <span className="text-[11px] font-medium text-[#0075de]">In Progress</span>
              <div className="text-2xl font-bold text-[#0075de] mt-1">
                {credits.inProgress}
              </div>
              <span className="text-[10px] text-[#787671]">Active Semester Load</span>
            </div>

            {/* 4. Credits Remaining */}
            <div className="p-4 rounded-[12px] border border-[#e5e3df] bg-white dark:border-[#2a2a2e] dark:bg-[#141416] shadow-2xs">
              <span className="text-[11px] font-medium text-[#dd5b00]">Remaining Credits</span>
              <div className="text-2xl font-bold text-[#dd5b00] mt-1">
                {credits.remaining}
              </div>
              <span className="text-[10px] text-[#787671]">To Clear Graduation</span>
            </div>

            {/* 5. Required Courses Count */}
            <div className="p-4 rounded-[12px] border border-[#e5e3df] bg-white dark:border-[#2a2a2e] dark:bg-[#141416] shadow-2xs">
              <span className="text-[11px] font-medium text-[#787671]">Courses Completed</span>
              <div className="text-2xl font-bold text-[#1a1a1a] dark:text-white mt-1">
                {courses.completed}
                <span className="text-xs font-normal text-[#787671] ml-1">/ {courses.totalCurriculum || courses.completed}</span>
              </div>
              <span className="text-[10px] text-[#787671]">
                {courses.remaining} Courses Remaining
              </span>
            </div>

            {/* 6. Estimated Remaining Semesters */}
            <div className="p-4 rounded-[12px] border border-[#e5e3df] bg-white dark:border-[#2a2a2e] dark:bg-[#141416] shadow-2xs">
              <span className="text-[11px] font-medium text-[#5645d4]">Est. Semesters</span>
              <div className="text-2xl font-bold text-[#5645d4] dark:text-[#8070f6] mt-1">
                {graduationEstimates.estimatedRemainingSemesters}
              </div>
              <span className="text-[10px] text-[#787671]">
                ~{graduationEstimates.averageCreditsNeededPerSemester} cr / term
              </span>
            </div>
          </div>

          {/* Master Degree Progress Gauge Bar */}
          <div className="p-5 rounded-[12px] border border-[#e5e3df] bg-white dark:border-[#2a2a2e] dark:bg-[#141416] shadow-2xs space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-[#1a1a1a] dark:text-white">Overall Degree Completion</span>
                <span className="text-xs text-[#5645d4] font-bold">({credits.completionPercentage}%)</span>
              </div>
              <span className="text-xs text-[#787671]">
                {credits.completed} earned + {credits.inProgress} in progress of {credits.totalRequired} total
              </span>
            </div>

            {/* Stacked Progress Bar */}
            <div className="w-full bg-[#ede9e4] dark:bg-[#252528] h-3.5 rounded-full overflow-hidden flex">
              {/* Completed Credits (Green) */}
              <div
                className="bg-[#1aae39] h-full transition-all duration-700 relative"
                style={{ width: `${credits.completionPercentage}%` }}
                title={`Completed: ${credits.completed} credits (${credits.completionPercentage}%)`}
              />
              {/* In Progress Credits (Blue) */}
              <div
                className="bg-[#0075de] h-full opacity-70 transition-all duration-700"
                style={{
                  width: `${
                    credits.totalRequired > 0
                      ? Math.min(100 - credits.completionPercentage, (credits.inProgress / credits.totalRequired) * 100)
                      : 0
                  }%`,
                }}
                title={`In Progress: ${credits.inProgress} credits`}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-[#787671] pt-1">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#1aae39]" />
                  <span>Completed: {credits.completed} cr</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#0075de]" />
                  <span>In Progress: {credits.inProgress} cr</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#ede9e4] dark:bg-[#252528]" />
                  <span>Remaining: {credits.remaining} cr</span>
                </span>
              </div>
              <span>
                Calculation: <code>eligible completed credits ({credits.completed}) / total degree requirement ({credits.totalRequired}) × 100</code>
              </span>
            </div>
          </div>

          {/* Category Distribution Grid & Graduation Timeline */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Category Breakdown (7 cols) */}
            <div className="lg:col-span-7 p-5 rounded-[12px] border border-[#e5e3df] bg-white dark:border-[#2a2a2e] dark:bg-[#141416] shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#1a1a1a] dark:text-white">
                  Curriculum Category Breakdown
                </h3>
                <span className="text-[11px] text-[#787671]">
                  Credit completion by requirement group
                </span>
              </div>

              {categoryBreakdown.length === 0 ? (
                <p className="text-xs text-[#787671] italic py-6 text-center">
                  No category groupings configured yet. Load or configure your curriculum in Setup & Import.
                </p>
              ) : (
                <div className="space-y-3">
                  {categoryBreakdown.map((cat) => (
                    <div key={cat.category} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-[#1a1a1a] dark:text-white">
                          {cat.category.replace('_', ' ')}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-[#787671]">
                            {cat.completedCredits} / {cat.totalCredits} cr
                          </span>
                          <span className="text-xs font-bold text-[#5645d4] dark:text-[#8070f6]">
                            {cat.completionPercentage}%
                          </span>
                        </div>
                      </div>

                      <div className="w-full bg-[#ede9e4] dark:bg-[#252528] h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-[#5645d4] h-full rounded-full transition-all duration-500"
                          style={{ width: `${cat.completionPercentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Graduation Timeline & Assumptions (5 cols) */}
            <div className="lg:col-span-5 p-5 rounded-[12px] border border-[#e5e3df] bg-[#fbfbfa] dark:border-[#2a2a2e] dark:bg-[#141416] shadow-2xs space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-[#5645d4]" />
                  <h3 className="text-sm font-bold text-[#1a1a1a] dark:text-white">
                    Estimated Graduation Plan
                  </h3>
                </div>

                <div className="p-3.5 rounded-[10px] bg-white dark:bg-[#1a1a1e] border border-[#e5e3df] dark:border-[#2a2a2e] space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[#787671]">Target Plan:</span>
                    <strong className="text-[#1aae39] font-bold">
                      {graduationEstimates.estimatedRemainingSemesters} Semesters Remaining
                    </strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#787671]">Conservative Plan (Min Load):</span>
                    <strong className="text-[#5d5b54] dark:text-[#a4a097]">
                      {graduationEstimates.conservativeSemesters} Semesters
                    </strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#787671]">Prerequisite Critical Path:</span>
                    <strong className="text-[#5645d4] font-semibold">
                      {graduationEstimates.criticalPathDepth} Terms Depth
                    </strong>
                  </div>
                </div>

                {/* Assumptions List */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#787671]">
                    Calculation Assumptions
                  </span>
                  <ul className="text-[11px] text-[#5d5b54] dark:text-[#a4a097] space-y-1 list-disc list-inside">
                    {graduationEstimates.assumptions.map((item, idx) => (
                      <li key={idx} className="leading-relaxed">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="pt-3 border-t border-[#e5e3df] dark:border-[#2a2a2e] text-[10px] text-[#787671] flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5 shrink-0" />
                <span>
                  Estimates are mathematical planning projections and do not replace official registrar graduation clearance.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CURRICULUM ALL COURSES */}
      {activeTab === 'CURRICULUM' && (
        <div className="animate-fadeIn">
          <CurriculumTable
            courses={curriculumData?.courses || []}
            onAddCourse={() => {
              setEditingCourse(null);
              setIsAddCourseModalOpen(true);
            }}
            onEditCourse={(c) => {
              setEditingCourse(c);
              setIsAddCourseModalOpen(true);
            }}
            onDeleteCourse={(id) => deleteCourseMutation.mutate(id)}
          />
        </div>
      )}

      {/* TAB 3: SEMESTER CREDIT HISTORY */}
      {activeTab === 'HISTORY' && (
        <div className="animate-fadeIn">
          <SemesterCreditHistory semesters={semesterHistory} />
        </div>
      )}

      {/* TAB 4: NEXT SEMESTER PLANNER */}
      {activeTab === 'PLANNER' && (
        <div className="animate-fadeIn">
          {plannerData ? (
            <NextSemesterPlanner
              data={plannerData}
              onSaveSchedule={async (courseIds) => {
                await saveScheduleMutation.mutateAsync(courseIds);
              }}
            />
          ) : (
            <div className="p-8 text-center text-xs text-[#787671]">
              Loading planner data...
            </div>
          )}
        </div>
      )}

      {/* MODALS */}
      <AddCourseModal
        isOpen={isAddCourseModalOpen}
        onClose={() => {
          setIsAddCourseModalOpen(false);
          setEditingCourse(null);
        }}
        onSave={async (courseData) => {
          await saveCourseMutation.mutateAsync(courseData);
        }}
        existingCourses={curriculumData?.courses || []}
        initialData={editingCourse}
      />

      <DegreeSetupModal
        isOpen={isSetupModalOpen}
        onClose={() => setIsSetupModalOpen(false)}
        program={program}
        onSaveProgram={async (updated) => {
          await updateProgramMutation.mutateAsync(updated);
        }}
        onImportCurriculum={async (data) => {
          return await importMutation.mutateAsync(data);
        }}
        onClearCurriculum={async () => {
          await clearCurriculumMutation.mutateAsync();
        }}
      />
    </div>
  );
};

export default DegreePlannerPage;
