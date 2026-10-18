import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { GraduationCap, Plus, FolderOpen, FileText, CheckSquare, Award, ArrowRight } from 'lucide-react';
import { api } from '../../lib/api';
import { Course, Semester } from '../../types';

export const CoursesPage: React.FC = () => {
  const [selectedSemester, setSelectedSemester] = useState<string>('');

  const { data: semesters = [] } = useQuery<Semester[]>({
    queryKey: ['semesters'],
    queryFn: () => api.getSemesters(),
  });

  const { data: courses = [], isLoading } = useQuery<Course[]>({
    queryKey: ['courses', selectedSemester],
    queryFn: () => api.getCourses(selectedSemester || undefined),
  });

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Courses Workspace
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Manage course syllabi, class schedules, exam preparation, and study materials.
          </p>
        </div>

        {/* Semester Filter */}
        <div className="flex items-center gap-3">
          <select
            value={selectedSemester}
            onChange={(e) => setSelectedSemester(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-2xs focus:border-indigo-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
          >
            <option value="">All Semesters</option>
            {semesters.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} {s.status === 'ACTIVE' ? '(Active)' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Course Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-56 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
      ) : courses.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center dark:border-slate-800">
          <GraduationCap className="h-10 w-10 mx-auto text-slate-400 mb-3" />
          <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-base">No courses found</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            Use the top right "New Item" button to add a course to your current semester.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <div
              key={course.id}
              className="group relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs hover:shadow-md transition-all dark:border-slate-800 dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700"
            >
              <div>
                {/* Header Badge */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: course.color || '#3b82f6' }}
                    />
                    <span className="font-bold text-xs text-slate-700 dark:text-slate-300">
                      {course.code}
                    </span>
                    {course.section && (
                      <span className="text-[10px] text-slate-400">Sec {course.section}</span>
                    )}
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {course.credits} Credits
                  </span>
                </div>

                {/* Course Title */}
                <Link to={`/courses/${course.id}`} className="block">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {course.title}
                  </h3>
                </Link>

                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {course.teacherName || 'Instructor TBA'} {course.roomNumber ? `• ${course.roomNumber}` : ''}
                </p>

                {/* Term & Class schedule */}
                <div className="mt-3 space-y-1 text-xs">
                  {course.semester && (
                    <p className="text-slate-400">
                      Term: <span className="font-medium text-slate-700 dark:text-slate-300">{course.semester.name}</span>
                    </p>
                  )}
                  {course.classSchedule && (
                    <p className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                      ⏰ {course.classSchedule}
                    </p>
                  )}
                </div>

                {/* Progress bar */}
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                    <span>Syllabus Progress</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{course.progress}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 rounded-full transition-all"
                      style={{ width: `${course.progress}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Footer info & link */}
              <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-3">
                  <span title="Documents">{course._count?.documents || 0} docs</span>
                  <span title="Notes">{course._count?.notes || 0} notes</span>
                  <span title="Exams">{course._count?.exams || 0} exams</span>
                </div>
                <Link
                  to={`/courses/${course.id}`}
                  className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                >
                  Workspace <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
