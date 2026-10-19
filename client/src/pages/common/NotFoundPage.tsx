import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FileQuestion, Home, ArrowLeft, CalendarDays, FileText, GraduationCap } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="min-h-[75vh] flex items-center justify-center p-6 md:p-12 text-[#37352f] dark:text-[#f0eeec]">
      <div className="card-notion p-8 md:p-12 max-w-lg w-full text-center space-y-6 bg-white dark:bg-[#141416] border border-[#e5e3df] dark:border-[#2a2a2e] rounded-[16px] shadow-sm">
        {/* 404 Badge & Icon */}
        <div className="inline-flex items-center justify-center p-4 rounded-full bg-[#5645d4]/10 text-[#5645d4] dark:bg-[#5645d4]/20 dark:text-[#8070f6] mb-2">
          <FileQuestion className="h-10 w-10 stroke-[1.75]" />
        </div>

        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-[4px] bg-[#f0eeec] dark:bg-[#252528] text-[#787671] dark:text-[#a4a097]">
            404 Error • Page Not Found
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-[#1a1a1a] dark:text-white mt-3">
            Lost in Academic Cyberspace
          </h1>
          <p className="text-xs text-[#787671] dark:text-[#a4a097] mt-2 max-w-sm mx-auto leading-relaxed">
            The path <code className="px-1.5 py-0.5 rounded bg-[#f6f5f4] dark:bg-[#202024] font-mono text-[#5645d4] dark:text-[#d6b6f6]">{location.pathname}</code> does not match any active ScholarFlow workspace, module, or document record.
          </p>
        </div>

        {/* Quick Return Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={() => navigate(-1)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-[8px] bg-[#f0eeec] hover:bg-[#e5e3df] dark:bg-[#252528] dark:hover:bg-[#2f2f34] text-xs font-semibold text-[#1a1a1a] dark:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Go Back</span>
          </button>

          <Link
            to="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-[8px] bg-[#5645d4] hover:bg-[#4534b3] text-xs font-semibold text-white shadow-2xs transition-colors cursor-pointer"
          >
            <Home className="h-3.5 w-3.5" />
            <span>Workspace Dashboard</span>
          </Link>
        </div>

        {/* Popular destinations */}
        <div className="pt-6 border-t border-[#ede9e4] dark:border-[#252528] text-left">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#a4a097] mb-2.5">
            Quick Navigation Links
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Link
              to="/semesters"
              className="flex items-center gap-2 p-2 rounded-[6px] hover:bg-[#f6f5f4] dark:hover:bg-[#202024] text-xs text-[#5d5b54] dark:text-[#a4a097] transition-colors"
            >
              <CalendarDays className="h-3.5 w-3.5 text-[#5645d4]" />
              <span className="truncate">Semesters</span>
            </Link>
            <Link
              to="/notes"
              className="flex items-center gap-2 p-2 rounded-[6px] hover:bg-[#f6f5f4] dark:hover:bg-[#202024] text-xs text-[#5d5b54] dark:text-[#a4a097] transition-colors"
            >
              <FileText className="h-3.5 w-3.5 text-emerald-500" />
              <span className="truncate">Knowledge Base</span>
            </Link>
            <Link
              to="/courses"
              className="flex items-center gap-2 p-2 rounded-[6px] hover:bg-[#f6f5f4] dark:hover:bg-[#202024] text-xs text-[#5d5b54] dark:text-[#a4a097] transition-colors"
            >
              <GraduationCap className="h-3.5 w-3.5 text-sky-500" />
              <span className="truncate">Courses</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
