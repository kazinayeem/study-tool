import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  customItems?: BreadcrumbItem[];
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ customItems }) => {
  const location = useLocation();

  if (customItems && customItems.length > 0) {
    return (
      <nav aria-label="Breadcrumb" className="flex items-center space-x-1.5 text-xs text-slate-500">
        <Link to="/" className="flex items-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
          <Home className="h-3.5 w-3.5" />
        </Link>
        {customItems.map((item, idx) => {
          const isLast = idx === customItems.length - 1;
          return (
            <React.Fragment key={idx}>
              <ChevronRight className="h-3 w-3 text-slate-300 dark:text-slate-600 shrink-0" />
              {item.href && !isLast ? (
                <Link to={item.href} className="hover:text-slate-700 dark:hover:text-slate-200 transition-colors truncate max-w-[150px]">
                  {item.label}
                </Link>
              ) : (
                <span className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[200px]">
                  {item.label}
                </span>
              )}
            </React.Fragment>
          );
        })}
      </nav>
    );
  }

  // Derive from pathname
  const pathSegments = location.pathname.split('/').filter(Boolean);
  if (pathSegments.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="flex items-center space-x-1.5 text-xs text-slate-500">
      <Link to="/" className="flex items-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
        <Home className="h-3.5 w-3.5" />
      </Link>
      {pathSegments.map((segment, idx) => {
        const isLast = idx === pathSegments.length - 1;
        const href = `/${pathSegments.slice(0, idx + 1).join('/')}`;
        const formatted = segment.charAt(0).toUpperCase() + segment.slice(1);

        return (
          <React.Fragment key={href}>
            <ChevronRight className="h-3 w-3 text-slate-300 dark:text-slate-600 shrink-0" />
            {isLast ? (
              <span className="font-medium text-slate-800 dark:text-slate-200 capitalize">
                {formatted}
              </span>
            ) : (
              <Link to={href} className="hover:text-slate-700 dark:hover:text-slate-200 transition-colors capitalize">
                {formatted}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};
