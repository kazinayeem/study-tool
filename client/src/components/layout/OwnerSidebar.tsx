import React from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, CreditCard, Crown, Settings, Shield, Tags, Users, Wallet } from 'lucide-react';
import { api } from '../../lib/api';
import { cn } from '../../lib/utils';
import { useI18n } from '../../i18n/I18nContext';

interface OwnerSidebarProps {
  collapsed: boolean;
  setCollapsed: (c: boolean | ((prev: boolean) => boolean)) => void;
}

/** The SaaS owner does not use the study tool, so they get a navigation made only of business tools. */
export const OwnerSidebar: React.FC<OwnerSidebarProps> = ({ collapsed, setCollapsed }) => {
  const { t } = useI18n();
  const location = useLocation();
  const tab = new URLSearchParams(location.search).get('tab') ?? 'students';

  const { data: stats } = useQuery({ queryKey: ['owner-stats'], queryFn: () => api.getOwnerStats(), refetchInterval: 30000 });

  const business = [
    { label: t('nav.ownerStudents'), icon: Users, to: '/owner', tab: 'students' },
    { label: t('nav.ownerRequests'), icon: CreditCard, to: '/owner?tab=requests', tab: 'requests', count: stats?.pending },
    { label: t('nav.ownerPlans'), icon: Tags, to: '/owner?tab=plans', tab: 'plans' },
    { label: t('nav.ownerPayment'), icon: Wallet, to: '/owner?tab=payment', tab: 'payment' },
  ];
  const system = [
    { label: t('nav.admin'), icon: Shield, to: '/admin' },
    { label: t('nav.settings'), icon: Settings, to: '/settings' },
  ];

  const itemClass = (active: boolean) =>
    cn(
      'group flex items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-sm font-medium transition-colors',
      active
        ? 'bg-[#dcf0e8] font-semibold text-[#0d3b30] dark:bg-[#0d3b30] dark:text-[#a8dcc9]'
        : 'text-[#5d5b54] hover:bg-[#f0eeec] hover:text-[#1a1a1a] dark:text-[#a4a097] dark:hover:bg-[#202024] dark:hover:text-white'
    );

  return (
    <aside
      className={cn(
        'relative z-20 flex flex-col border-r border-[#e5e3df] bg-[#fbfbfa] transition-all duration-200 dark:border-[#2a2a2e] dark:bg-[#141416]',
        collapsed ? 'w-20' : 'w-64'
      )}
    >
      <div className="flex h-16 items-center justify-between border-b border-[#e5e3df] px-4 dark:border-[#2a2a2e]">
        <Link to="/owner" className="flex items-center gap-2.5 overflow-hidden">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] bg-[#0f6b57] text-white">
            <Crown className="h-5 w-5" />
          </span>
          {!collapsed && (
            <span className="flex flex-col truncate">
              <span className="font-[family-name:var(--font-display)] text-base font-bold text-[#14201c] dark:text-white">BornoFlow</span>
              <span className="text-[11px] text-[#787671] dark:text-[#a4a097]">{t('owner.title')}</span>
            </span>
          )}
        </Link>
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="hidden h-7 w-7 items-center justify-center rounded-[6px] text-[#787671] hover:bg-[#f0eeec] dark:hover:bg-[#252528] md:flex"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto px-2.5 py-3" aria-label={t('owner.title')}>
        <div className="space-y-0.5">
          {business.map((item) => {
            const active = location.pathname === '/owner' && tab === item.tab;
            return (
              <NavLink key={item.to} to={item.to} className={itemClass(active)} title={collapsed ? item.label : undefined} aria-current={active ? 'page' : undefined}>
                <item.icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                {!collapsed && !!item.count && (
                  <span className="rounded-full bg-[#ffd84d] px-1.5 py-0.5 text-[10px] font-bold text-[#3d2f00]">{item.count}</span>
                )}
              </NavLink>
            );
          })}
        </div>
        <div className="space-y-0.5 border-t border-[#e5e3df] pt-3 dark:border-[#2a2a2e]">
          {system.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => itemClass(isActive)} title={collapsed ? item.label : undefined}>
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          ))}
        </div>
      </nav>
    </aside>
  );
};

export default OwnerSidebar;
