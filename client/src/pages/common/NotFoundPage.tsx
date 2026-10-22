import React from 'react';
import { useI18n } from '../../i18n/I18nContext';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FileQuestion, Home, ArrowLeft, CalendarDays, FileText, GraduationCap } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  const location = useLocation();
  const { t } = useI18n();
  const navigate = useNavigate();

  return (
    <div className="min-h-[75vh] flex items-center justify-center p-6 md:p-12 text-[#37352f] dark:text-[#f0eeec]">
      <div className="card-notion p-8 md:p-12 max-w-lg w-full text-center space-y-6 bg-white dark:bg-[#141416] border border-[#e5e3df] dark:border-[#2a2a2e] rounded-[16px] shadow-sm">
        {/* 404 Badge & Icon */}
        <div className="inline-flex items-center justify-center p-4 rounded-full bg-[#0f6b57]/10 text-[#0f6b57] dark:bg-[#0f6b57]/20 dark:text-[#4ccba5] mb-2">
          <FileQuestion className="h-10 w-10 stroke-[1.75]" />
        </div>

        <div>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-[4px] bg-[#f0eeec] dark:bg-[#252528] text-[#787671] dark:text-[#a4a097]">
            {t('nf.badge')}
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-[#1a1a1a] dark:text-white mt-3">
            {t('nf.title')}
          </h1>
          <p className="text-xs text-[#787671] dark:text-[#a4a097] mt-2 max-w-sm mx-auto leading-relaxed">
            {t('nf.body', { path: location.pathname })}
          </p>
        </div>

        {/* Quick Return Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={() => navigate(-1)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-[8px] bg-[#f0eeec] hover:bg-[#e5e3df] dark:bg-[#252528] dark:hover:bg-[#2f2f34] text-xs font-semibold text-[#1a1a1a] dark:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>{t('nf.back')}</span>
          </button>

          <Link
            to="/dashboard"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-[8px] bg-[#0f6b57] hover:bg-[#0b5645] text-xs font-semibold text-white shadow-2xs transition-colors cursor-pointer"
          >
            <Home className="h-3.5 w-3.5" />
            <span>{t('nf.home')}</span>
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
              <CalendarDays className="h-3.5 w-3.5 text-[#0f6b57]" />
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
