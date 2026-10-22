import React, { useState } from 'react';
import {
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Trash2,
  AlertCircle,
  HelpCircle,
  Layers,
  ArrowRight,
  BookOpen,
  Check,
} from 'lucide-react';
import { NextSemesterPlannerData, CurriculumCourse, PlannedCourseItem } from '../../../types';

interface NextSemesterPlannerProps {
  data: NextSemesterPlannerData;
  onSaveSchedule: (courseIds: string[]) => Promise<void>;
}

export const NextSemesterPlanner: React.FC<NextSemesterPlannerProps> = ({ data, onSaveSchedule }) => {
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>(
    data.plannedCourses.map((p) => p.curriculumCourseId)
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeCategoryTab, setActiveCategoryTab] = useState<'RETAKES' | 'BLOCKERS' | 'RECOMMENDED' | 'ELIGIBLE' | 'INELIGIBLE'>('RECOMMENDED');

  // Map of all courses by ID for quick credit retrieval
  const allAvailableCourses = [
    ...data.retakesRequired,
    ...data.criticalPrerequisiteBlockers,
    ...data.recommendedForUpcoming,
    ...data.otherEligible,
    ...data.ineligible,
  ];

  const courseMap = new Map<string, CurriculumCourse>();
  for (const c of allAvailableCourses) {
    if (!courseMap.has(c.id)) {
      courseMap.set(c.id, c);
    }
  }

  // Also include already planned courses
  for (const p of data.plannedCourses) {
    if (!courseMap.has(p.curriculumCourseId)) {
      courseMap.set(p.curriculumCourseId, {
        id: p.curriculumCourseId,
        code: p.code,
        title: p.title,
        credits: p.credits,
        category: p.category,
        isRequired: p.isRequired,
        minPassingGrade: 'D',
        status: 'PLANNED',
        allPrerequisitesSatisfied: true,
        prerequisites: [],
      });
    }
  }

  // Calculate live selected credits
  const currentTotalCredits = selectedCourseIds.reduce((sum, id) => {
    const c = courseMap.get(id);
    return sum + (c?.credits || 3.0);
  }, 0);

  const toggleSelectCourse = (courseId: string) => {
    setSelectedCourseIds((prev) =>
      prev.includes(courseId) ? prev.filter((id) => id !== courseId) : [...prev, courseId]
    );
    setSaveSuccess(false);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await onSaveSchedule(selectedCourseIds);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } finally {
      setIsSaving(false);
    }
  };

  // Live warnings
  const liveWarnings: string[] = [];
  if (currentTotalCredits > data.maxCreditsLimit) {
    liveWarnings.push(
      `Planned credit load (${currentTotalCredits} cr) exceeds maximum allowed limit (${data.maxCreditsLimit} cr).`
    );
  }
  if (currentTotalCredits > 0 && currentTotalCredits < data.minCreditsLimit) {
    liveWarnings.push(
      `Planned credit load (${currentTotalCredits} cr) is below minimum required load (${data.minCreditsLimit} cr).`
    );
  }

  // Prerequisite check for selected courses
  for (const id of selectedCourseIds) {
    const c = courseMap.get(id);
    if (c && !c.allPrerequisitesSatisfied && c.status !== 'COMPLETED') {
      const unmet = c.prerequisites?.filter((p) => !p.isSatisfied).map((p) => p.code) || [];
      if (unmet.length > 0) {
        liveWarnings.push(`Course ${c.code} has incomplete prerequisite(s): ${unmet.join(', ')}.`);
      }
    }
  }

  // Credit Load Meter Percentage
  const meterPercentage = Math.min(
    100,
    Math.round((currentTotalCredits / (data.maxCreditsLimit * 1.15)) * 100)
  );

  return (
    <div className="space-y-6">
      {/* 1. Recommendation & Target Semester Hero Banner */}
      <div className="rounded-[12px] border border-[#e5e3df] bg-[#fbfbfa] dark:border-[#2a2a2e] dark:bg-[#141416] p-5 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] px-2 py-0.5 rounded-[4px] bg-[#dcf0e8] text-[#0f6b57] dark:bg-[#0a2a22] dark:text-[#4ccba5] font-bold uppercase tracking-wider">
                Term Planning
              </span>
              <span className="text-xs text-[#787671] dark:text-[#a4a097]">
                Target: <strong className="text-[#1a1a1a] dark:text-white">{data.targetSemesterName}</strong>
              </span>
            </div>
            <h2 className="text-lg font-bold text-[#1a1a1a] dark:text-white">
              Next Semester Credit Load Recommendation
            </h2>
            <p className="text-xs text-[#5d5b54] dark:text-[#a4a097] mt-0.5">
              Recommended load is{' '}
              <strong className="text-[#0f6b57] dark:text-[#4ccba5]">
                {data.suggestedCreditLoad} credits
              </strong>{' '}
              based on remaining degree requirements ({data.assumptions.remainingCredits} credits remaining)
              and standard program limits ({data.minCreditsLimit} – {data.maxCreditsLimit} credits/term).
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="btn-notion-primary text-xs px-4 py-2 flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <Check className="h-4 w-4" />
              <span>{isSaving ? 'Saving Schedule...' : 'Save Semester Plan'}</span>
            </button>
          </div>
        </div>

        {/* Live Credit Load Meter */}
        <div className="mt-5 pt-4 border-t border-[#e5e3df] dark:border-[#2a2a2e]">
          <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[#1a1a1a] dark:text-white">
                Selected Load: <strong>{currentTotalCredits} Credits</strong>
              </span>
              <span className="text-[11px] text-[#787671] font-normal">
                ({selectedCourseIds.length} courses)
              </span>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-[#787671]">
              <span>Min: {data.minCreditsLimit} cr</span>
              <span>Target: {data.suggestedCreditLoad} cr</span>
              <span>Max: {data.maxCreditsLimit} cr</span>
            </div>
          </div>

          <div className="w-full bg-[#ede9e4] dark:bg-[#252528] h-2.5 rounded-full overflow-hidden relative">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                currentTotalCredits > data.maxCreditsLimit
                  ? 'bg-[#e03131]'
                  : currentTotalCredits < data.minCreditsLimit
                  ? 'bg-[#f59e0b]'
                  : 'bg-[#0f6b57]'
              }`}
              style={{ width: `${meterPercentage}%` }}
            />
          </div>
        </div>

        {/* Success Banner */}
        {saveSuccess && (
          <div className="mt-3 p-3 rounded-[8px] bg-[#d9f3e1] text-[#1aae39] border border-[#1aae39]/30 text-xs font-medium flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>Planned schedule successfully saved for {data.targetSemesterName}!</span>
          </div>
        )}

        {/* Warnings Banner */}
        {liveWarnings.length > 0 && (
          <div className="mt-3 p-3 rounded-[8px] bg-[#fff3e0] text-[#b45309] border border-[#f59e0b]/40 text-xs space-y-1">
            <div className="flex items-center gap-1.5 font-bold">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>Schedule Advisories ({liveWarnings.length}):</span>
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-[11px] pl-1">
              {liveWarnings.map((warn, i) => (
                <li key={i}>{warn}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* 2. Course Selection & Scheduled Plan Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Course Palette (8 cols) */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#1a1a1a] dark:text-white">
              Curriculum Course Selection
            </h3>
            <span className="text-[11px] text-[#787671]">
              Prioritized by graduation urgency
            </span>
          </div>

          {/* Palette Priority Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-[#e5e3df] dark:border-[#2a2a2e] text-xs">
            {data.retakesRequired.length > 0 && (
              <button
                onClick={() => setActiveCategoryTab('RETAKES')}
                className={`px-3 py-1.5 rounded-t-[6px] font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                  activeCategoryTab === 'RETAKES'
                    ? 'border-b-2 border-[#e03131] text-[#e03131] bg-[#fde0ec]/50 dark:bg-[#3d1226]/40'
                    : 'text-[#787671] hover:text-[#1a1a1a]'
                }`}
              >
                Retakes ({data.retakesRequired.length})
              </button>
            )}

            {data.criticalPrerequisiteBlockers.length > 0 && (
              <button
                onClick={() => setActiveCategoryTab('BLOCKERS')}
                className={`px-3 py-1.5 rounded-t-[6px] font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                  activeCategoryTab === 'BLOCKERS'
                    ? 'border-b-2 border-[#0f6b57] text-[#0f6b57] bg-[#dcf0e8]/50 dark:bg-[#0a2a22]/40'
                    : 'text-[#787671] hover:text-[#1a1a1a]'
                }`}
              >
                Prereq Blockers ({data.criticalPrerequisiteBlockers.length})
              </button>
            )}

            <button
              onClick={() => setActiveCategoryTab('RECOMMENDED')}
              className={`px-3 py-1.5 rounded-t-[6px] font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                activeCategoryTab === 'RECOMMENDED'
                  ? 'border-b-2 border-[#0f6b57] text-[#0f6b57] bg-[#dcf0e8]/50 dark:bg-[#0a2a22]/40'
                  : 'text-[#787671] hover:text-[#1a1a1a]'
              }`}
            >
              Recommended Term Courses ({data.recommendedForUpcoming.length})
            </button>

            <button
              onClick={() => setActiveCategoryTab('ELIGIBLE')}
              className={`px-3 py-1.5 rounded-t-[6px] font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                activeCategoryTab === 'ELIGIBLE'
                  ? 'border-b-2 border-[#1aae39] text-[#1aae39] bg-[#d9f3e1]/50 dark:bg-[#13331c]/40'
                  : 'text-[#787671] hover:text-[#1a1a1a]'
              }`}
            >
              Other Eligible ({data.otherEligible.length})
            </button>

            {data.ineligible.length > 0 && (
              <button
                onClick={() => setActiveCategoryTab('INELIGIBLE')}
                className={`px-3 py-1.5 rounded-t-[6px] font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                  activeCategoryTab === 'INELIGIBLE'
                    ? 'border-b-2 border-[#787671] text-[#787671] bg-[#f0eeec] dark:bg-[#252528]'
                    : 'text-[#a4a097] hover:text-[#1a1a1a]'
                }`}
              >
                Ineligible ({data.ineligible.length})
              </button>
            )}
          </div>

          {/* Active Course List */}
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {activeCategoryTab === 'RETAKES' &&
              data.retakesRequired.map((c) => {
                const isSelected = selectedCourseIds.includes(c.id);
                return (
                  <div
                    key={c.id}
                    className={`p-3 rounded-[8px] border transition-all flex items-center justify-between ${
                      isSelected
                        ? 'border-[#e03131] bg-[#fde0ec]/30 dark:bg-[#3d1226]/30'
                        : 'border-[#e5e3df] bg-white dark:border-[#2a2a2e] dark:bg-[#141416] hover:border-[#c8c4be]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-[#e03131]">{c.code}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#fde0ec] text-[#e03131] font-semibold">
                          Retake Priority
                        </span>
                        <span className="text-xs font-semibold text-[#1a1a1a] dark:text-white">{c.title}</span>
                      </div>
                      <p className="text-[11px] text-[#787671] mt-0.5">
                        {c.credits} Credits • {c.category}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleSelectCourse(c.id)}
                      className={`text-xs px-2.5 py-1 rounded-[6px] font-medium transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-[#e03131] text-white'
                          : 'btn-notion-secondary text-[#e03131]'
                      }`}
                    >
                      {isSelected ? '✓ Added' : '+ Add'}
                    </button>
                  </div>
                );
              })}

            {activeCategoryTab === 'BLOCKERS' &&
              data.criticalPrerequisiteBlockers.map((c) => {
                const isSelected = selectedCourseIds.includes(c.id);
                return (
                  <div
                    key={c.id}
                    className={`p-3 rounded-[8px] border transition-all flex items-center justify-between ${
                      isSelected
                        ? 'border-[#0f6b57] bg-[#dcf0e8]/30 dark:bg-[#0a2a22]/30'
                        : 'border-[#e5e3df] bg-white dark:border-[#2a2a2e] dark:bg-[#141416] hover:border-[#c8c4be]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-[#0f6b57]">{c.code}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#dcf0e8] text-[#0f6b57] font-semibold">
                          Unlocks {c.downstreamUnlockCount} Courses
                        </span>
                        <span className="text-xs font-semibold text-[#1a1a1a] dark:text-white">{c.title}</span>
                      </div>
                      <p className="text-[11px] text-[#787671] mt-0.5">
                        {c.credits} Credits • {c.category}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleSelectCourse(c.id)}
                      className={`text-xs px-2.5 py-1 rounded-[6px] font-medium transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-[#0f6b57] text-white'
                          : 'btn-notion-secondary text-[#0f6b57]'
                      }`}
                    >
                      {isSelected ? '✓ Added' : '+ Add'}
                    </button>
                  </div>
                );
              })}

            {activeCategoryTab === 'RECOMMENDED' &&
              (data.recommendedForUpcoming.length === 0 ? (
                <p className="text-xs text-[#787671] italic p-4 text-center">
                  No courses explicitly tagged for this recommended term. Check "Other Eligible" courses below.
                </p>
              ) : (
                data.recommendedForUpcoming.map((c) => {
                  const isSelected = selectedCourseIds.includes(c.id);
                  return (
                    <div
                      key={c.id}
                      className={`p-3 rounded-[8px] border transition-all flex items-center justify-between ${
                        isSelected
                          ? 'border-[#0f6b57] bg-[#dcf0e8]/30 dark:bg-[#0a2a22]/30'
                          : 'border-[#e5e3df] bg-white dark:border-[#2a2a2e] dark:bg-[#141416] hover:border-[#c8c4be]'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-[#1a1a1a] dark:text-white">{c.code}</span>
                          <span className="text-xs font-medium text-[#37352f] dark:text-[#f0eeec]">{c.title}</span>
                        </div>
                        <p className="text-[11px] text-[#787671] mt-0.5">
                          {c.credits} Credits • {c.category} • {c.isRequired ? 'Mandatory Core' : 'Elective'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleSelectCourse(c.id)}
                        className={`text-xs px-2.5 py-1 rounded-[6px] font-medium transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-[#0f6b57] text-white'
                            : 'btn-notion-secondary text-[#0f6b57]'
                        }`}
                      >
                        {isSelected ? '✓ Added' : '+ Add'}
                      </button>
                    </div>
                  );
                })
              ))}

            {activeCategoryTab === 'ELIGIBLE' &&
              (data.otherEligible.length === 0 ? (
                <p className="text-xs text-[#787671] italic p-4 text-center">
                  No additional eligible courses found.
                </p>
              ) : (
                data.otherEligible.map((c) => {
                  const isSelected = selectedCourseIds.includes(c.id);
                  return (
                    <div
                      key={c.id}
                      className={`p-3 rounded-[8px] border transition-all flex items-center justify-between ${
                        isSelected
                          ? 'border-[#1aae39] bg-[#d9f3e1]/30 dark:bg-[#13331c]/30'
                          : 'border-[#e5e3df] bg-white dark:border-[#2a2a2e] dark:bg-[#141416] hover:border-[#c8c4be]'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-[#1a1a1a] dark:text-white">{c.code}</span>
                          <span className="text-xs font-medium text-[#37352f] dark:text-[#f0eeec]">{c.title}</span>
                        </div>
                        <p className="text-[11px] text-[#787671] mt-0.5">
                          {c.credits} Credits • {c.category}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleSelectCourse(c.id)}
                        className={`text-xs px-2.5 py-1 rounded-[6px] font-medium transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-[#1aae39] text-white'
                            : 'btn-notion-secondary text-[#1aae39]'
                        }`}
                      >
                        {isSelected ? '✓ Added' : '+ Add'}
                      </button>
                    </div>
                  );
                })
              ))}

            {activeCategoryTab === 'INELIGIBLE' &&
              data.ineligible.map((c) => (
                <div
                  key={c.id}
                  className="p-3 rounded-[8px] border border-[#e5e3df] bg-[#fbfbfa] dark:border-[#2a2a2e] dark:bg-[#18181b] opacity-80 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#787671]">{c.code}</span>
                      <span className="text-[#787671]">{c.title}</span>
                    </div>
                    <p className="text-[11px] text-[#e03131] mt-0.5 flex items-center gap-1 font-medium">
                      <AlertCircle className="h-3 w-3" />
                      <span>Missing prerequisites: {c.unmetPrerequisites?.join(', ') || 'Unmet prerequisites'}</span>
                    </p>
                  </div>
                  <span className="text-[10px] text-[#a4a097] px-2 py-0.5 bg-[#f0eeec] dark:bg-[#252528] rounded">
                    Locked
                  </span>
                </div>
              ))}
          </div>
        </div>

        {/* Right Column: Scheduled Planned Courses (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#1a1a1a] dark:text-white">
              Proposed Schedule ({selectedCourseIds.length})
            </h3>
            <span className="text-xs font-semibold text-[#0f6b57] dark:text-[#4ccba5]">
              {currentTotalCredits} Credits Total
            </span>
          </div>

          <div className="rounded-[12px] border border-[#e5e3df] bg-white dark:border-[#2a2a2e] dark:bg-[#141416] p-4 shadow-2xs space-y-2 min-h-[300px] flex flex-col justify-between">
            <div className="space-y-2">
              {selectedCourseIds.length === 0 ? (
                <div className="py-16 text-center text-[#787671]">
                  <Layers className="h-8 w-8 mx-auto text-[#a4a097] mb-2" />
                  <p className="text-xs font-medium">No courses selected for this schedule yet.</p>
                  <p className="text-[11px] text-[#a4a097]">
                    Click "+ Add" on courses from the left palette to construct your semester plan.
                  </p>
                </div>
              ) : (
                selectedCourseIds.map((id) => {
                  const c = courseMap.get(id);
                  return (
                    <div
                      key={id}
                      className="p-2.5 rounded-[8px] border border-[#ede9e4] bg-[#fbfbfa] dark:border-[#252528] dark:bg-[#17171a] flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-[#1a1a1a] dark:text-white">{c?.code}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#dcf0e8] text-[#0f6b57] font-semibold">
                            {c?.credits} cr
                          </span>
                        </div>
                        <p className="text-[11px] text-[#5d5b54] dark:text-[#a4a097] truncate max-w-[190px]">
                          {c?.title}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleSelectCourse(id)}
                        className="p-1 rounded text-[#787671] hover:bg-[#fde0ec] hover:text-[#e03131] transition-colors cursor-pointer"
                        title="Remove from proposed schedule"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Bottom Schedule Summary */}
            {selectedCourseIds.length > 0 && (
              <div className="pt-3 border-t border-[#e5e3df] dark:border-[#2a2a2e] space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-[#1a1a1a] dark:text-white">
                  <span>Total Planned Load:</span>
                  <span className="text-sm font-bold text-[#0f6b57] dark:text-[#4ccba5]">
                    {currentTotalCredits} Credits
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="w-full btn-notion-primary text-xs py-2 flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
                >
                  <Check className="h-4 w-4" />
                  <span>{isSaving ? 'Saving Schedule...' : 'Save Semester Plan'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
