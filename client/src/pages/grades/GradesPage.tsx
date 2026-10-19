import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  GraduationCap,
  Calculator,
  Plus,
  Trash2,
  Edit2,
  Download,
  Printer,
  TrendingUp,
  Award,
  BookOpen,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Info,
  Calendar,
  X,
} from 'lucide-react';
import { api } from '../../lib/api';
import { formatDate } from '../../lib/utils';
import {
  GradeSummaryResponse,
  GradeScale,
  Assessment,
  Course,
  Semester,
} from '../../types';

import { useParams, useSearchParams } from 'react-router-dom';
import { useActiveSemester } from '../../hooks/useActiveSemester';
import { AcademicBreadcrumb } from '../../components/common/AcademicBreadcrumb';


export const GradesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { id: paramSemesterId, semesterId: routeSemesterId } = useParams<{ id?: string; semesterId?: string }>();
  const [searchParams] = useSearchParams();
  const { activeSemesterId } = useActiveSemester();

  const effectiveSemesterId = paramSemesterId || routeSemesterId || searchParams.get('semesterId') || activeSemesterId || '';
  const [selectedSemesterId, setSelectedSemesterId] = useState<string>(effectiveSemesterId);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');

  useEffect(() => {
    const sem = paramSemesterId || routeSemesterId || searchParams.get('semesterId');
    if (sem) {
      setSelectedSemesterId(sem);
    }
  }, [paramSemesterId, routeSemesterId, searchParams]);

  // Modals state
  const [isAssessmentModalOpen, setIsAssessmentModalOpen] = useState(false);
  const [editingAssessment, setEditingAssessment] = useState<Assessment | null>(null);
  const [isScaleModalOpen, setIsScaleModalOpen] = useState(false);
  const [isWhatIfModalOpen, setIsWhatIfModalOpen] = useState(false);

  // Form states for Assessment
  const [assessmentTitle, setAssessmentTitle] = useState('');
  const [assessmentCategory, setAssessmentCategory] = useState('ASSIGNMENT');
  const [assessmentMaxMarks, setAssessmentMaxMarks] = useState(100);
  const [assessmentObtainedMarks, setAssessmentObtainedMarks] = useState<number | ''>('');
  const [assessmentWeight, setAssessmentWeight] = useState<number | ''>('');
  const [assessmentDate, setAssessmentDate] = useState('');
  const [assessmentNotes, setAssessmentNotes] = useState('');
  const [assessmentCourseId, setAssessmentCourseId] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // What-If Calculator state
  const [targetCgpaInput, setTargetCgpaInput] = useState<number>(3.8);
  const [remainingCreditsInput, setRemainingCreditsInput] = useState<number>(30);
  const [scenarioName, setScenarioName] = useState('');
  const [hypoCourseName, setHypoCourseName] = useState('');
  const [hypoCredits, setHypoCredits] = useState<number>(3);
  const [hypoGrade, setHypoGrade] = useState<string>('A');
  const [hypoGradePoint, setHypoGradePoint] = useState<number>(3.75);
  const [hypoCoursesList, setHypoCoursesList] = useState<Array<{ name: string; credits: number; grade: string; gradePoint: number }>>([]);

  const { data: savedScenarios = [] } = useQuery<any[]>({
    queryKey: ['gradeScenarios'],
    queryFn: () => api.getGradeScenarios(),
  });

  const saveScenarioMutation = useMutation({
    mutationFn: (projected: number) => {
      return api.createGradeScenario({
        name: scenarioName.trim() || `What-If Scenario ${savedScenarios.length + 1}`,
        targetCgpa: targetCgpaInput,
        projectedCgpa: projected,
        hypotheticalCourses: hypoCoursesList,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gradeScenarios'] });
      setScenarioName('');
    },
  });

  const deleteScenarioMutation = useMutation({
    mutationFn: (id: string) => api.deleteGradeScenario(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gradeScenarios'] });
    },
  });

  // Queries
  const { data: semesters = [] } = useQuery<Semester[]>({
    queryKey: ['semesters'],
    queryFn: () => api.getSemesters(),
  });

  const { data: courses = [] } = useQuery<Course[]>({
    queryKey: ['courses'],
    queryFn: () => api.getCourses(),
  });

  const { data: gradeScale, isLoading: scaleLoading } = useQuery<GradeScale>({
    queryKey: ['gradeScale'],
    queryFn: () => api.getGradeScale(),
  });

  const { data: gradeSummary, isLoading: summaryLoading } = useQuery<GradeSummaryResponse>({
    queryKey: ['gradeSummary', selectedSemesterId],
    queryFn: () => api.getGradeSummary(selectedSemesterId || undefined),
  });

  const assessmentParams: Record<string, string> = {};
  if (selectedSemesterId) assessmentParams.semesterId = selectedSemesterId;
  if (selectedCourseId) assessmentParams.courseId = selectedCourseId;

  const { data: assessments = [], isLoading: assessmentsLoading } = useQuery<Assessment[]>({
    queryKey: ['assessments', assessmentParams],
    queryFn: () => api.getAssessments(assessmentParams),
  });

  // Mutations
  const saveAssessmentMutation = useMutation({
    mutationFn: (data: any) => {
      if (editingAssessment) {
        return api.updateAssessment(editingAssessment.id, data);
      }
      return api.createAssessment(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessments'] });
      queryClient.invalidateQueries({ queryKey: ['gradeSummary'] });
      setIsAssessmentModalOpen(false);
      resetAssessmentForm();
    },
    onError: (err: any) => {
      setFormError(err.message || 'Failed to save assessment');
    },
  });

  const deleteAssessmentMutation = useMutation({
    mutationFn: (id: string) => api.deleteAssessment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessments'] });
      queryClient.invalidateQueries({ queryKey: ['gradeSummary'] });
    },
  });

  const updateScaleMutation = useMutation({
    mutationFn: (data: any) => api.updateGradeScale(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gradeScale'] });
      queryClient.invalidateQueries({ queryKey: ['gradeSummary'] });
      setIsScaleModalOpen(false);
    },
  });

  const updateGoalMutation = useMutation({
    mutationFn: (val: number) => api.updateTargetGoal(val),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gradeSummary'] });
    },
  });

  const resetAssessmentForm = () => {
    setEditingAssessment(null);
    setAssessmentTitle('');
    setAssessmentCategory('ASSIGNMENT');
    setAssessmentMaxMarks(100);
    setAssessmentObtainedMarks('');
    setAssessmentWeight('');
    setAssessmentDate('');
    setAssessmentNotes('');
    setAssessmentCourseId(selectedCourseId || (courses[0]?.id ?? ''));
    setFormError(null);
  };

  const handleOpenAddAssessment = () => {
    resetAssessmentForm();
    setIsAssessmentModalOpen(true);
  };

  const handleEditAssessment = (a: Assessment) => {
    setEditingAssessment(a);
    setAssessmentTitle(a.title);
    setAssessmentCategory(a.category);
    setAssessmentMaxMarks(a.maxMarks);
    setAssessmentObtainedMarks(
      a.obtainedMarks !== null && a.obtainedMarks !== undefined ? a.obtainedMarks : ''
    );
    setAssessmentWeight(
      a.weightPercentage !== null && a.weightPercentage !== undefined ? a.weightPercentage : ''
    );
    setAssessmentDate(a.date ? a.date.slice(0, 10) : '');
    setAssessmentNotes(a.notes || '');
    setAssessmentCourseId(a.courseId);
    setFormError(null);
    setIsAssessmentModalOpen(true);
  };

  const handleSubmitAssessment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assessmentTitle.trim()) {
      setFormError('Assessment title is required');
      return;
    }
    if (!assessmentCourseId) {
      setFormError('Please select a course');
      return;
    }
    if (assessmentMaxMarks <= 0) {
      setFormError('Max marks must be greater than 0');
      return;
    }
    if (assessmentObtainedMarks !== '' && Number(assessmentObtainedMarks) > assessmentMaxMarks) {
      setFormError(`Obtained marks cannot exceed maximum marks (${assessmentMaxMarks})`);
      return;
    }

    const payload = {
      courseId: assessmentCourseId,
      title: assessmentTitle.trim(),
      category: assessmentCategory,
      maxMarks: Number(assessmentMaxMarks),
      obtainedMarks: assessmentObtainedMarks !== '' ? Number(assessmentObtainedMarks) : null,
      weightPercentage: assessmentWeight !== '' ? Number(assessmentWeight) : null,
      date: assessmentDate ? new Date(assessmentDate).toISOString() : null,
      notes: assessmentNotes.trim() || null,
    };

    saveAssessmentMutation.mutate(payload);
  };

  // CSV Export handler
  const handleExportCsv = () => {
    window.open('/api/grades/export/csv', '_blank');
  };

  // What-if calculation
  const currentCgpa = gradeSummary?.cgpa ?? 0;
  const completedCredits = gradeSummary?.totalCreditsCompleted ?? 0;
  const neededGpa =
    remainingCreditsInput > 0
      ? (targetCgpaInput * (completedCredits + remainingCreditsInput) - currentCgpa * completedCredits) /
        remainingCreditsInput
      : 0;

  const hypoCreditsSum = hypoCoursesList.reduce((acc, c) => acc + c.credits, 0);
  const hypoPointsSum = hypoCoursesList.reduce((acc, c) => acc + (c.credits * c.gradePoint), 0);
  const totalSimCredits = completedCredits + hypoCreditsSum;
  const projectedCgpa = totalSimCredits > 0
    ? (currentCgpa * completedCredits + hypoPointsSum) / totalSimCredits
    : currentCgpa;

  const currentSemesterObj = semesters.find((s) => s.id === selectedSemesterId);
  const currentCourseObj = courses.find((c) => c.id === selectedCourseId);

  return (
    <div className="min-h-full bg-slate-50 p-6 dark:bg-slate-950 sm:p-8 space-y-6">
      {/* Academic Context Breadcrumb */}
      <AcademicBreadcrumb
        semesterName={currentSemesterObj?.name}
        courseCode={currentCourseObj?.code}
        courseName={currentCourseObj?.title}
        moduleName="Grades & CGPA Analytics"
      />

      {/* Header Bar */}
      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">

        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 text-white shadow-md shadow-amber-500/20">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Grades & CGPA Analytics
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Credit-weighted GPA calculations, assessment tracking, and target scenario planning
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setIsScaleModalOpen(true)}
            className="btn-notion-secondary text-xs flex items-center gap-1.5"
            title="Configure Grade Scale"
          >
            <Sliders className="h-3.5 w-3.5 text-slate-400" />
            <span>Grading Scale</span>
          </button>

          <button
            onClick={() => setIsWhatIfModalOpen(true)}
            className="btn-notion-secondary text-xs flex items-center gap-1.5 border-[#5645d4]/30 text-[#5645d4] dark:text-[#8070f6]"
            title="What-If CGPA Simulator"
          >
            <TrendingUp className="h-3.5 w-3.5 text-[#5645d4]" />
            <span>What-If Simulator</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="btn-notion-secondary text-xs flex items-center gap-1.5"
            title="Export grades as CSV"
          >
            <Download className="h-3.5 w-3.5 text-slate-400" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => window.print()}
            className="btn-notion-secondary text-xs flex items-center gap-1.5"
            title="Printable Academic Report"
          >
            <Printer className="h-3.5 w-3.5 text-slate-400" />
            <span>Print Report</span>
          </button>

          <button
            onClick={handleOpenAddAssessment}
            className="btn-notion-primary text-xs flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4" />
            <span>Add Assessment</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Summary Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Cumulative GPA Card */}
        <div className="card-notion p-5">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="font-medium">Cumulative GPA (CGPA)</span>
            <span className="rounded-[4px] bg-[#5645d4]/10 px-2 py-0.5 text-[10px] font-bold text-[#5645d4] dark:bg-[#5645d4]/20 dark:text-[#8070f6]">
              {gradeScale?.scaleName || '4.00 Scale'}
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              {summaryLoading ? '...' : gradeSummary?.cgpa.toFixed(2) ?? '0.00'}
            </span>
            <span className="text-xs text-slate-400">/ 4.00</span>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Weighted across {gradeSummary?.totalCreditsCompleted ?? 0} completed credits
          </div>
        </div>

        {/* Selected Semester GPA Card */}
        <div className="card-notion p-5">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="font-medium">Term / Semester GPA</span>
            <select
              value={selectedSemesterId}
              onChange={(e) => setSelectedSemesterId(e.target.value)}
              className="rounded-[6px] border border-[#e5e3df] bg-white px-2 py-0.5 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 focus:outline-none focus:border-[#5645d4]"
            >
              <option value="">Latest Term</option>
              {semesters.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-[#5645d4] dark:text-[#8070f6]">
              {summaryLoading ? '...' : gradeSummary?.semesterGpa.toFixed(2) ?? '0.00'}
            </span>
            <span className="text-xs text-slate-400">/ 4.00</span>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            {gradeSummary?.courseGrades.length ?? 0} active courses in this term
          </div>
        </div>

        {/* Credits Earned vs Attempted */}
        <div className="card-notion p-5">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="font-medium">Credits Progress</span>
            <Award className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400">
              {gradeSummary?.totalCreditsCompleted ?? 0}
            </span>
            <span className="text-xs text-slate-400">
              earned of {gradeSummary?.totalCreditsAttempted ?? 0} attempted
            </span>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{
                width: `${
                  gradeSummary?.totalCreditsAttempted
                    ? Math.min(
                        100,
                        (gradeSummary.totalCreditsCompleted / gradeSummary.totalCreditsAttempted) * 100
                      )
                    : 0
                }%`,
              }}
            />
          </div>
        </div>

        {/* Target Goal Comparison */}
        <div className="card-notion p-5">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="font-medium">Target CGPA Goal</span>
            <button
              onClick={() => {
                const val = prompt('Enter your target CGPA (e.g. 3.85):', String(gradeSummary?.targetCgpa || 3.8));
                if (val && !isNaN(Number(val))) {
                  updateGoalMutation.mutate(Number(val));
                }
              }}
              className="text-[11px] font-semibold text-[#5645d4] hover:underline"
            >
              Set Goal
            </button>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-amber-500">
              {gradeSummary?.targetCgpa ? gradeSummary.targetCgpa.toFixed(2) : '3.80'}
            </span>
            {gradeSummary && (
              <span
                className={`text-xs font-semibold ${
                  gradeSummary.cgpa >= (gradeSummary.targetCgpa || 3.8)
                    ? 'text-emerald-600'
                    : 'text-amber-600'
                }`}
              >
                {gradeSummary.cgpa >= (gradeSummary.targetCgpa || 3.8)
                  ? '✓ Goal Met'
                  : `Gap: ${(
                      (gradeSummary.targetCgpa || 3.8) - gradeSummary.cgpa
                    ).toFixed(2)}`}
              </span>
            )}
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Keep track of required trajectory
          </div>
        </div>
      </div>

      {/* Grid: Course Grades Table & Term Breakdown */}
      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left 2 Cols: Course Grades Overview */}
        <div className="lg:col-span-2 card-notion p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Course Grade Breakdown
              </h2>
              <p className="text-xs text-slate-400">
                Calculated from course assessments and credit weightings
              </p>
            </div>
            <span className="text-xs text-slate-400">
              {gradeSummary?.courseGrades.length ?? 0} courses
            </span>
          </div>

          {summaryLoading ? (
            <div className="space-y-3 py-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 w-full animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
              ))}
            </div>
          ) : gradeSummary?.courseGrades.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              <BookOpen className="mx-auto mb-2 h-8 w-8 text-slate-300 dark:text-slate-700" />
              No courses found for this term. Add courses or select another semester.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 dark:border-slate-800">
                    <th className="pb-3 font-semibold">Course</th>
                    <th className="pb-3 font-semibold">Credits</th>
                    <th className="pb-3 font-semibold">Total Score</th>
                    <th className="pb-3 font-semibold">Letter</th>
                    <th className="pb-3 font-semibold">Grade Point</th>
                    <th className="pb-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {gradeSummary?.courseGrades.map((cg) => (
                    <tr key={cg.courseId} className="group hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <td className="py-3">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {cg.courseCode}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate max-w-[180px]">
                          {cg.courseTitle}
                        </div>
                      </td>
                      <td className="py-3 font-medium text-slate-700 dark:text-slate-300">
                        {cg.credits}
                      </td>
                      <td className="py-3">
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {cg.totalMarks !== null ? `${cg.totalMarks.toFixed(1)}%` : 'In Progress'}
                        </span>
                      </td>
                      <td className="py-3">
                        <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                          {cg.letterGrade}
                        </span>
                      </td>
                      <td className="py-3 font-bold text-slate-900 dark:text-white">
                        {cg.gradePoint.toFixed(2)}
                      </td>
                      <td className="py-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            cg.isPassing
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                          }`}
                        >
                          {cg.isPassing ? 'Passing' : 'Below Pass'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right 1 Col: Semester-wise GPA History */}
        <div className="card-notion p-6">
          <div className="mb-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Semester Trend
            </h2>
            <p className="text-xs text-slate-400">
              GPA progression across all registered terms
            </p>
          </div>

          <div className="space-y-4">
            {semesters.map((sem) => {
              const semGPA =
                gradeSummary?.semesterGpaHistory?.[sem.id] ?? (sem.id === selectedSemesterId ? gradeSummary?.semesterGpa : 3.5);
              const pct = (Number(semGPA || 0) / 4.0) * 100;

              return (
                <div key={sem.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {sem.name}
                    </span>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">
                      {Number(semGPA || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 rounded-xl bg-slate-50 p-4 border border-slate-100 dark:bg-slate-800/40 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-2 font-semibold text-slate-700 dark:text-slate-300 mb-1">
              <Info className="h-3.5 w-3.5 text-indigo-500" />
              <span>Configured Calculation Rule</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              Semester GPA = sum(Course Grade Point × Course Credits) / sum(Credits). Cumulative GPA handles course retakes and credit transfers as specified in settings.
            </p>
          </div>
        </div>
      </div>

      {/* Assessment Tracking Table */}
      <div className="card-notion p-6">
        <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Course Assessments & Marks
            </h2>
            <p className="text-xs text-slate-400">
              Quizzes, midterms, finals, class tests, labs, and attendance marks
            </p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              <option value="">All Courses</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} - {c.title}
                </option>
              ))}
            </select>

            <button
              onClick={handleOpenAddAssessment}
              className="btn-notion-primary text-xs flex items-center gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>New Assessment</span>
            </button>
          </div>
        </div>

        {assessmentsLoading ? (
          <div className="space-y-3 py-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 w-full animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
            ))}
          </div>
        ) : assessments.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            <Calculator className="mx-auto mb-2 h-8 w-8 text-slate-300 dark:text-slate-700" />
            <p>No assessments recorded for the selected filter.</p>
            <button
              onClick={handleOpenAddAssessment}
              className="mt-2 text-indigo-600 font-semibold hover:underline"
            >
              Record your first quiz or exam mark
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 dark:border-slate-800">
                  <th className="pb-3 font-semibold">Title</th>
                  <th className="pb-3 font-semibold">Category</th>
                  <th className="pb-3 font-semibold">Course</th>
                  <th className="pb-3 font-semibold">Score</th>
                  <th className="pb-3 font-semibold">Weight</th>
                  <th className="pb-3 font-semibold">Date</th>
                  <th className="pb-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {assessments.map((a) => {
                  const pct =
                    a.obtainedMarks !== null && a.obtainedMarks !== undefined && a.maxMarks > 0
                      ? (a.obtainedMarks / a.maxMarks) * 100
                      : null;

                  return (
                    <tr key={a.id} className="group hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <td className="py-3 font-semibold text-slate-900 dark:text-white">
                        {a.title}
                        {a.notes && (
                          <div className="text-[10px] text-slate-400 font-normal truncate max-w-xs">
                            {a.notes}
                          </div>
                        )}
                      </td>
                      <td className="py-3">
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          {a.category}
                        </span>
                      </td>
                      <td className="py-3 font-medium text-slate-700 dark:text-slate-300">
                        {a.course ? a.course.code : 'General'}
                      </td>
                      <td className="py-3">
                        {a.obtainedMarks !== null ? (
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {a.obtainedMarks} / {a.maxMarks}{' '}
                            <span className="text-[10px] text-slate-400">({pct?.toFixed(0)}%)</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Pending / Unmarked</span>
                        )}
                      </td>
                      <td className="py-3 text-slate-600 dark:text-slate-400">
                        {a.weightPercentage !== null ? `${a.weightPercentage}%` : '—'}
                      </td>
                      <td className="py-3 text-slate-400">
                        {a.date ? formatDate(a.date, 'MMM d, yyyy') : '—'}
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleEditAssessment(a)}
                            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                            title="Edit"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Delete assessment "${a.title}"?`)) {
                                deleteAssessmentMutation.mutate(a.id);
                              }
                            }}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: Add / Edit Assessment */}
      {isAssessmentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md card-notion p-6 shadow-xl dark:bg-slate-900">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
              {editingAssessment ? 'Edit Assessment' : 'New Assessment'}
            </h3>

            {formError && (
              <div className="mb-4 flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitAssessment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Assessment Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Midterm Examination, Quiz 1, Project Report"
                  value={assessmentTitle}
                  onChange={(e) => setAssessmentTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Course *
                  </label>
                  <select
                    value={assessmentCourseId}
                    onChange={(e) => setAssessmentCourseId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="">Select Course</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>{c.code} - {c.title}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    value={assessmentCategory}
                    onChange={(e) => setAssessmentCategory(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="ATTENDANCE">Attendance</option>
                    <option value="CLASS_TEST">Class Test</option>
                    <option value="QUIZ">Quiz</option>
                    <option value="ASSIGNMENT">Assignment</option>
                    <option value="MIDTERM">Midterm Exam</option>
                    <option value="FINAL_EXAM">Final Exam</option>
                    <option value="LAB">Lab / Practical</option>
                    <option value="PROJECT">Project / Presentation</option>
                    <option value="OTHER">Other Custom</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Max Marks *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    value={assessmentMaxMarks}
                    onChange={(e) => setAssessmentMaxMarks(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Obtained Marks
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="Optional"
                    value={assessmentObtainedMarks}
                    onChange={(e) => setAssessmentObtainedMarks(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Weight %
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="any"
                    placeholder="e.g. 20"
                    value={assessmentWeight}
                    onChange={(e) => setAssessmentWeight(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={assessmentDate}
                    onChange={(e) => setAssessmentDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Notes
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Chapters 1-4"
                    value={assessmentNotes}
                    onChange={(e) => setAssessmentNotes(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAssessmentModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveAssessmentMutation.isPending}
                  className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow-md hover:bg-indigo-700 active:scale-95 disabled:opacity-50"
                >
                  {saveAssessmentMutation.isPending ? 'Saving...' : 'Save Assessment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Grading Scale Configuration */}
      {isScaleModalOpen && gradeScale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg card-notion p-6 shadow-xl dark:bg-slate-900">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              University Grading Scale Settings
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Configure your university's custom grading rules, minimum passing marks, and grade letter boundaries.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateScaleMutation.mutate({
                  scaleName: gradeScale.scaleName,
                  minPassingGrade: gradeScale.minPassingGrade,
                  rules: gradeScale.rules,
                });
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Scale Name
                </label>
                <input
                  type="text"
                  value={gradeScale.scaleName}
                  onChange={(e) => (gradeScale.scaleName = e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Minimum Passing Grade Point
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={gradeScale.minPassingGrade}
                  onChange={(e) => (gradeScale.minPassingGrade = Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800 text-xs text-slate-500">
                <span className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Current Grade Tiers:
                </span>
                <div className="grid grid-cols-4 gap-2 text-[11px]">
                  {Array.isArray(gradeScale.rules) &&
                    gradeScale.rules.map((r: any, idx: number) => (
                      <div key={idx} className="rounded bg-slate-50 p-1.5 dark:bg-slate-800 text-center">
                        <span className="font-bold text-indigo-600 dark:text-indigo-400">{r.letter}</span>
                        <div className="text-[10px] text-slate-400">{r.point.toFixed(2)} ({r.minMarks}%)</div>
                      </div>
                    ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsScaleModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={updateScaleMutation.isPending}
                  className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow-md hover:bg-indigo-700"
                >
                  {updateScaleMutation.isPending ? 'Saving...' : 'Update Grading Policy'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: What-If CGPA Scenario Calculator */}
      {isWhatIfModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-xl card-notion p-6 shadow-xl dark:bg-slate-900 max-h-[90vh] overflow-y-auto space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-[#5645d4]" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  What-If CGPA Scenario Simulator
                </h3>
              </div>
              <button onClick={() => setIsWhatIfModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="rounded-[8px] bg-slate-50 dark:bg-slate-800/50 p-3 text-[11px] text-slate-500 border border-slate-200 dark:border-slate-700">
              🛡️ <strong>Safety Guarantee:</strong> What-If scenarios are purely hypothetical simulations for academic planning. They <strong>never</strong> modify or overwrite your official recorded course grades.
            </div>

            {/* Current vs Projected CGPA Overview Banner */}
            <div className="grid grid-cols-2 gap-3 p-4 rounded-[12px] bg-[#5645d4]/10 border border-[#5645d4]/20 dark:bg-[#5645d4]/15 dark:border-[#5645d4]/30">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Current Actual CGPA</span>
                <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                  {currentCgpa.toFixed(2)}
                </p>
                <span className="text-[10px] text-slate-400">{completedCredits} completed credits</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#5645d4]">Projected Scenario CGPA</span>
                <p className="text-2xl font-black text-[#5645d4] mt-0.5">
                  {projectedCgpa.toFixed(2)}
                </p>
                <span className={`text-[10px] font-bold ${projectedCgpa >= currentCgpa ? 'text-emerald-600' : 'text-rose-500'}`}>
                  {projectedCgpa >= currentCgpa ? `+${(projectedCgpa - currentCgpa).toFixed(2)}` : (projectedCgpa - currentCgpa).toFixed(2)} change
                </span>
              </div>
            </div>

            {/* Section 1: Add Hypothetical Future Course */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                Simulate Future or Upcoming Courses
              </h4>
              <div className="grid grid-cols-12 gap-2 text-xs">
                <input
                  type="text"
                  placeholder="Course name (e.g. Distributed Systems)"
                  value={hypoCourseName}
                  onChange={(e) => setHypoCourseName(e.target.value)}
                  className="col-span-6 rounded-[8px] border border-slate-300 p-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none focus:border-[#5645d4]"
                />
                <input
                  type="number"
                  min="1"
                  max="6"
                  placeholder="Credits"
                  value={hypoCredits}
                  onChange={(e) => setHypoCredits(Number(e.target.value))}
                  className="col-span-2 rounded-[8px] border border-slate-300 p-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white text-center"
                />
                <select
                  value={hypoGrade}
                  onChange={(e) => {
                    const g = e.target.value;
                    setHypoGrade(g);
                    const pts: Record<string, number> = {
                      'A+': 4.0, 'A': 3.75, 'A-': 3.5, 'B+': 3.25,
                      'B': 3.0, 'B-': 2.75, 'C+': 2.5, 'C': 2.25,
                      'D': 2.0, 'F': 0.0,
                    };
                    setHypoGradePoint(pts[g] || 3.0);
                  }}
                  className="col-span-2 rounded-[8px] border border-slate-300 p-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="A+">A+ (4.00)</option>
                  <option value="A">A (3.75)</option>
                  <option value="A-">A- (3.50)</option>
                  <option value="B+">B+ (3.25)</option>
                  <option value="B">B (3.00)</option>
                  <option value="B-">B- (2.75)</option>
                  <option value="C+">C+ (2.50)</option>
                  <option value="C">C (2.25)</option>
                  <option value="D">D (2.00)</option>
                  <option value="F">F (0.00)</option>
                </select>
                <button
                  type="button"
                  onClick={() => {
                    if (!hypoCourseName.trim()) return;
                    setHypoCoursesList([
                      ...hypoCoursesList,
                      { name: hypoCourseName.trim(), credits: hypoCredits, grade: hypoGrade, gradePoint: hypoGradePoint },
                    ]);
                    setHypoCourseName('');
                  }}
                  className="col-span-2 rounded-[8px] bg-[#5645d4] hover:bg-[#4534b3] text-white font-bold text-xs"
                >
                  + Add
                </button>
              </div>

              {/* List of Simulated Courses */}
              {hypoCoursesList.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  {hypoCoursesList.map((c, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-[6px] bg-slate-100 dark:bg-slate-800 text-xs">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{c.name}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-slate-500">{c.credits} cr • {c.grade} ({c.gradePoint.toFixed(2)})</span>
                        <button
                          type="button"
                          onClick={() => setHypoCoursesList(hypoCoursesList.filter((_, idx) => idx !== i))}
                          className="text-slate-400 hover:text-rose-500"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Save Scenario Form */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Save Scenario for Later
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Scenario name (e.g. Fall 2026 Dean's List Target)"
                  value={scenarioName}
                  onChange={(e) => setScenarioName(e.target.value)}
                  className="flex-1 rounded-[8px] border border-slate-300 p-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => saveScenarioMutation.mutate(projectedCgpa)}
                  disabled={saveScenarioMutation.isPending || hypoCoursesList.length === 0}
                  className="rounded-[8px] bg-[#5645d4] hover:bg-[#4534b3] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
                >
                  {saveScenarioMutation.isPending ? 'Saving...' : 'Save Scenario'}
                </button>
              </div>
            </div>

            {/* Saved Scenarios List */}
            {savedScenarios.length > 0 && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  Saved Scenarios ({savedScenarios.length})
                </h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {savedScenarios.map((sc: any) => (
                    <div key={sc.id} className="flex items-center justify-between p-2.5 rounded-[8px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs">
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">{sc.name}</p>
                        <p className="text-[11px] text-slate-400">
                          Projected CGPA: <strong className="text-[#5645d4]">{sc.projectedCgpa?.toFixed(2)}</strong>
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteScenarioMutation.mutate(sc.id)}
                        className="text-slate-400 hover:text-rose-600 p-1"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsWhatIfModalOpen(false)}
                className="rounded-[8px] bg-[#5645d4] px-5 py-2 text-xs font-semibold text-white shadow-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
