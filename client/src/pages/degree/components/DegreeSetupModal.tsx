import React, { useState, useEffect } from 'react';
import {
  X,
  Settings,
  Upload,
  BookOpen,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Download,
} from 'lucide-react';
import { DegreeProgram } from '../../../types';

interface DegreeSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  program: DegreeProgram;
  onSaveProgram: (updated: Partial<DegreeProgram>) => Promise<void>;
  onImportCurriculum: (data: { template?: string; csvText?: string; clearExisting?: boolean }) => Promise<{ count: number; prerequisitesCount: number }>;
  onClearCurriculum: () => Promise<void>;
}

export const DegreeSetupModal: React.FC<DegreeSetupModalProps> = ({
  isOpen,
  onClose,
  program,
  onSaveProgram,
  onImportCurriculum,
  onClearCurriculum,
}) => {
  const [activeTab, setActiveTab] = useState<'PROGRAM' | 'IMPORT' | 'RESET'>('PROGRAM');

  // Program fields
  const [universityName, setUniversityName] = useState(program.universityName || '');
  const [programName, setProgramName] = useState(program.programName || '');
  const [department, setDepartment] = useState(program.department || '');
  const [degreeDurationYears, setDegreeDurationYears] = useState(program.degreeDurationYears || 4.0);
  const [totalCreditsRequired, setTotalCreditsRequired] = useState(program.totalCreditsRequired || 120.0);
  const [requiredSemesters, setRequiredSemesters] = useState(program.requiredSemesters || 8);
  const [curriculumYear, setCurriculumYear] = useState(program.curriculumYear || '2024-2025');
  const [startSemesterName, setStartSemesterName] = useState(program.startSemesterName || '');
  const [targetGraduationDate, setTargetGraduationDate] = useState(
    program.targetGraduationDate ? program.targetGraduationDate.slice(0, 10) : ''
  );
  const [minCreditsPerSemester, setMinCreditsPerSemester] = useState(program.minCreditsPerSemester || 12.0);
  const [maxCreditsPerSemester, setMaxCreditsPerSemester] = useState(program.maxCreditsPerSemester || 18.0);

  // Import fields
  const [selectedTemplate, setSelectedTemplate] = useState('cs-bs');
  const [csvText, setCsvText] = useState('');
  const [clearBeforeImport, setClearBeforeImport] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setUniversityName(program.universityName || '');
      setProgramName(program.programName || '');
      setDepartment(program.department || '');
      setDegreeDurationYears(program.degreeDurationYears || 4.0);
      setTotalCreditsRequired(program.totalCreditsRequired || 120.0);
      setRequiredSemesters(program.requiredSemesters || 8);
      setCurriculumYear(program.curriculumYear || '2024-2025');
      setStartSemesterName(program.startSemesterName || '');
      setTargetGraduationDate(program.targetGraduationDate ? program.targetGraduationDate.slice(0, 10) : '');
      setMinCreditsPerSemester(program.minCreditsPerSemester || 12.0);
      setMaxCreditsPerSemester(program.maxCreditsPerSemester || 18.0);
      setStatusMessage(null);
    }
  }, [isOpen, program]);

  if (!isOpen) return null;

  const handleSaveProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      setStatusMessage(null);
      await onSaveProgram({
        universityName: universityName.trim(),
        programName: programName.trim(),
        department: department.trim() || undefined,
        degreeDurationYears: Number(degreeDurationYears),
        totalCreditsRequired: Number(totalCreditsRequired),
        requiredSemesters: Number(requiredSemesters),
        curriculumYear: curriculumYear.trim() || undefined,
        startSemesterName: startSemesterName.trim() || undefined,
        targetGraduationDate: targetGraduationDate || null,
        minCreditsPerSemester: Number(minCreditsPerSemester),
        maxCreditsPerSemester: Number(maxCreditsPerSemester),
        isConfigured: true,
      });
      setStatusMessage({ type: 'success', text: 'Degree configuration updated successfully!' });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err?.message || 'Failed to update degree configuration' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTemplateImport = async () => {
    try {
      setIsSubmitting(true);
      setStatusMessage(null);
      const res = await onImportCurriculum({
        template: selectedTemplate,
        clearExisting: clearBeforeImport,
      });
      setStatusMessage({
        type: 'success',
        text: `Successfully imported ${res.count} courses with ${res.prerequisitesCount} prerequisite rules!`,
      });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err?.message || 'Failed to import curriculum template' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCsvImport = async () => {
    if (!csvText.trim()) {
      setStatusMessage({ type: 'error', text: 'Please paste CSV rows before importing.' });
      return;
    }
    try {
      setIsSubmitting(true);
      setStatusMessage(null);
      const res = await onImportCurriculum({
        csvText,
        clearExisting: clearBeforeImport,
      });
      setStatusMessage({
        type: 'success',
        text: `Successfully imported ${res.count} courses with ${res.prerequisitesCount} prerequisite links!`,
      });
      setCsvText('');
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err?.message || 'Failed to import CSV' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClear = async () => {
    if (!window.confirm('Are you sure you want to delete ALL curriculum courses? This cannot be undone.')) {
      return;
    }
    try {
      setIsSubmitting(true);
      setStatusMessage(null);
      await onClearCurriculum();
      setStatusMessage({ type: 'success', text: 'All curriculum courses have been removed.' });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err?.message || 'Failed to clear curriculum' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const sampleCsvExample = `Code, Title, Credits, Category, IsRequired, RecommendedSemester, Prerequisites
CSE115, Programming Language I, 3, CORE, true, 1, 
MAT116, Precalculus, 3, BASIC_SCIENCE, true, 1, 
CSE215, Object Oriented Programming, 3, CORE, true, 2, CSE115
MAT120, Calculus I, 3, BASIC_SCIENCE, true, 2, MAT116`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="w-full max-w-2xl rounded-[12px] border border-[#e5e3df] bg-white dark:border-[#2a2a2e] dark:bg-[#1a1a1e] shadow-xl overflow-hidden max-h-[92vh] flex flex-col text-[#37352f] dark:text-[#f0eeec]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#e5e3df] dark:border-[#2a2a2e] px-6 py-4">
          <div>
            <h3 className="text-base font-semibold text-[#1a1a1a] dark:text-white">
              University Degree Setup & Curriculum Import
            </h3>
            <p className="text-xs text-[#787671] dark:text-[#a4a097]">
              Configure university requirements or populate your degree catalog
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-[6px] p-1 text-[#787671] hover:bg-[#f0eeec] dark:hover:bg-[#252528] dark:text-[#a4a097]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 border-b border-[#e5e3df] dark:border-[#2a2a2e] px-6 bg-[#fbfbfa] dark:bg-[#141416] text-xs font-medium">
          <button
            onClick={() => { setActiveTab('PROGRAM'); setStatusMessage(null); }}
            className={`py-2.5 px-3 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'PROGRAM'
                ? 'border-[#0f6b57] text-[#0f6b57] font-semibold dark:border-[#4ccba5] dark:text-[#4ccba5]'
                : 'border-transparent text-[#787671] hover:text-[#1a1a1a] dark:text-[#a4a097]'
            }`}
          >
            Program Details & Limits
          </button>

          <button
            onClick={() => { setActiveTab('IMPORT'); setStatusMessage(null); }}
            className={`py-2.5 px-3 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'IMPORT'
                ? 'border-[#0f6b57] text-[#0f6b57] font-semibold dark:border-[#4ccba5] dark:text-[#4ccba5]'
                : 'border-transparent text-[#787671] hover:text-[#1a1a1a] dark:text-[#a4a097]'
            }`}
          >
            Import Curriculum (CSV / Presets)
          </button>

          <button
            onClick={() => { setActiveTab('RESET'); setStatusMessage(null); }}
            className={`py-2.5 px-3 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'RESET'
                ? 'border-[#e03131] text-[#e03131] font-semibold'
                : 'border-transparent text-[#787671] hover:text-[#e03131] dark:text-[#a4a097]'
            }`}
          >
            Reset Catalog
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {statusMessage && (
            <div
              className={`p-3 rounded-[8px] border text-xs font-medium flex items-center gap-2 ${
                statusMessage.type === 'success'
                  ? 'bg-[#d9f3e1] text-[#1aae39] border-[#1aae39]/30'
                  : 'bg-[#fde0ec] text-[#e03131] border-[#e03131]/30'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* TAB 1: PROGRAM CONFIG */}
          {activeTab === 'PROGRAM' && (
            <form onSubmit={handleSaveProgram} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#5d5b54] dark:text-[#a4a097] mb-1">
                    University / Institution *
                  </label>
                  <input
                    type="text"
                    value={universityName}
                    onChange={(e) => setUniversityName(e.target.value)}
                    placeholder="e.g. Stanford University"
                    className="w-full rounded-[8px] border border-[#c8c4be] bg-white px-3 py-1.5 text-xs text-[#1a1a1a] dark:border-[#37352f] dark:bg-[#141416] dark:text-white focus:outline-none focus:border-[#0f6b57]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#5d5b54] dark:text-[#a4a097] mb-1">
                    Degree / Program Name *
                  </label>
                  <input
                    type="text"
                    value={programName}
                    onChange={(e) => setProgramName(e.target.value)}
                    placeholder="e.g. B.S. in Computer Science"
                    className="w-full rounded-[8px] border border-[#c8c4be] bg-white px-3 py-1.5 text-xs text-[#1a1a1a] dark:border-[#37352f] dark:bg-[#141416] dark:text-white focus:outline-none focus:border-[#0f6b57]"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#5d5b54] dark:text-[#a4a097] mb-1">
                    Department / School
                  </label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="e.g. Computer Science & Engineering"
                    className="w-full rounded-[8px] border border-[#c8c4be] bg-white px-3 py-1.5 text-xs text-[#1a1a1a] dark:border-[#37352f] dark:bg-[#141416] dark:text-white focus:outline-none focus:border-[#0f6b57]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#5d5b54] dark:text-[#a4a097] mb-1">
                    Catalog Year
                  </label>
                  <input
                    type="text"
                    value={curriculumYear}
                    onChange={(e) => setCurriculumYear(e.target.value)}
                    placeholder="e.g. 2024-2025"
                    className="w-full rounded-[8px] border border-[#c8c4be] bg-white px-3 py-1.5 text-xs text-[#1a1a1a] dark:border-[#37352f] dark:bg-[#141416] dark:text-white focus:outline-none focus:border-[#0f6b57]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#5d5b54] dark:text-[#a4a097] mb-1">
                    Total Required Credits *
                  </label>
                  <input
                    type="number"
                    min="30"
                    max="250"
                    step="0.5"
                    value={totalCreditsRequired}
                    onChange={(e) => setTotalCreditsRequired(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-[8px] border border-[#c8c4be] bg-white px-3 py-1.5 text-xs font-bold text-[#1a1a1a] dark:border-[#37352f] dark:bg-[#141416] dark:text-white focus:outline-none focus:border-[#0f6b57]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#5d5b54] dark:text-[#a4a097] mb-1">
                    Required Semesters
                  </label>
                  <input
                    type="number"
                    min="2"
                    max="16"
                    value={requiredSemesters}
                    onChange={(e) => setRequiredSemesters(parseInt(e.target.value, 10) || 8)}
                    className="w-full rounded-[8px] border border-[#c8c4be] bg-white px-3 py-1.5 text-xs text-[#1a1a1a] dark:border-[#37352f] dark:bg-[#141416] dark:text-white focus:outline-none focus:border-[#0f6b57]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#5d5b54] dark:text-[#a4a097] mb-1">
                    Program Duration (Years)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max="8"
                    value={degreeDurationYears}
                    onChange={(e) => setDegreeDurationYears(parseFloat(e.target.value) || 4.0)}
                    className="w-full rounded-[8px] border border-[#c8c4be] bg-white px-3 py-1.5 text-xs text-[#1a1a1a] dark:border-[#37352f] dark:bg-[#141416] dark:text-white focus:outline-none focus:border-[#0f6b57]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#5d5b54] dark:text-[#a4a097] mb-1">
                    Min Credits / Semester
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="30"
                    value={minCreditsPerSemester}
                    onChange={(e) => setMinCreditsPerSemester(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-[8px] border border-[#c8c4be] bg-white px-3 py-1.5 text-xs text-[#1a1a1a] dark:border-[#37352f] dark:bg-[#141416] dark:text-white focus:outline-none focus:border-[#0f6b57]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#5d5b54] dark:text-[#a4a097] mb-1">
                    Max Allowed Credits / Term
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="6"
                    max="35"
                    value={maxCreditsPerSemester}
                    onChange={(e) => setMaxCreditsPerSemester(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-[8px] border border-[#c8c4be] bg-white px-3 py-1.5 text-xs text-[#1a1a1a] dark:border-[#37352f] dark:bg-[#141416] dark:text-white focus:outline-none focus:border-[#0f6b57]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#5d5b54] dark:text-[#a4a097] mb-1">
                    Starting Semester
                  </label>
                  <input
                    type="text"
                    value={startSemesterName}
                    onChange={(e) => setStartSemesterName(e.target.value)}
                    placeholder="e.g. Fall 2023"
                    className="w-full rounded-[8px] border border-[#c8c4be] bg-white px-3 py-1.5 text-xs text-[#1a1a1a] dark:border-[#37352f] dark:bg-[#141416] dark:text-white focus:outline-none focus:border-[#0f6b57]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#5d5b54] dark:text-[#a4a097] mb-1">
                    Target Graduation Date
                  </label>
                  <input
                    type="date"
                    value={targetGraduationDate}
                    onChange={(e) => setTargetGraduationDate(e.target.value)}
                    className="w-full rounded-[8px] border border-[#c8c4be] bg-white px-3 py-1.5 text-xs text-[#1a1a1a] dark:border-[#37352f] dark:bg-[#141416] dark:text-white focus:outline-none focus:border-[#0f6b57]"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-notion-primary text-xs px-4 py-2 cursor-pointer shadow-2xs"
                >
                  {isSubmitting ? 'Saving Settings...' : 'Save Degree Configuration'}
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: IMPORT CURRICULUM */}
          {activeTab === 'IMPORT' && (
            <div className="space-y-5">
              {/* Option A: Preset Template */}
              <div className="p-4 rounded-[10px] border border-[#e5e3df] dark:border-[#2a2a2e] bg-[#fbfbfa] dark:bg-[#141416] space-y-3">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-[#0f6b57]" />
                  <h4 className="text-xs font-bold text-[#1a1a1a] dark:text-white">
                    Option A: University Curriculum Preset Template
                  </h4>
                </div>
                <p className="text-[11px] text-[#787671]">
                  Quickly load a verified ABET/Standard university degree curriculum complete with prerequisite chains.
                </p>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <select
                    value={selectedTemplate}
                    onChange={(e) => setSelectedTemplate(e.target.value)}
                    className="flex-1 rounded-[8px] border border-[#c8c4be] bg-white px-3 py-1.5 text-xs font-medium text-[#1a1a1a] dark:border-[#37352f] dark:bg-[#141416] dark:text-white"
                  >
                    <option value="cs-bs">B.S. in Computer Science (4-Year, 130 Credits, 8 Semesters)</option>
                    <option value="se-bs">B.S. in Software Engineering (6 Terms, 9 Courses)</option>
                    <option value="bba-mis">B.B.A. in Management Information Systems (7 Courses)</option>
                  </select>

                  <button
                    type="button"
                    onClick={handleTemplateImport}
                    disabled={isSubmitting}
                    className="btn-notion-primary text-xs px-4 py-1.5 cursor-pointer shrink-0"
                  >
                    {isSubmitting ? 'Importing...' : 'Load Preset'}
                  </button>
                </div>
              </div>

              {/* Option B: CSV Import */}
              <div className="p-4 rounded-[10px] border border-[#e5e3df] dark:border-[#2a2a2e] bg-[#fbfbfa] dark:bg-[#141416] space-y-3">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-[#1aae39]" />
                  <h4 className="text-xs font-bold text-[#1a1a1a] dark:text-white">
                    Option B: CSV Curriculum Import
                  </h4>
                </div>
                <p className="text-[11px] text-[#787671]">
                  Paste CSV lines matching: <code>Code, Title, Credits, Category, IsRequired, RecommendedSemester, Prerequisites</code>
                </p>

                <textarea
                  rows={4}
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  placeholder={sampleCsvExample}
                  className="w-full font-mono rounded-[8px] border border-[#c8c4be] bg-white p-2.5 text-[11px] text-[#1a1a1a] dark:border-[#37352f] dark:bg-[#141416] dark:text-white focus:outline-none focus:border-[#0f6b57]"
                />

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-[#5d5b54] dark:text-[#a4a097]">
                    <input
                      type="checkbox"
                      checked={clearBeforeImport}
                      onChange={(e) => setClearBeforeImport(e.target.checked)}
                      className="rounded border-[#c8c4be] text-[#0f6b57]"
                    />
                    <span>Clear existing catalog before import</span>
                  </label>

                  <button
                    type="button"
                    onClick={handleCsvImport}
                    disabled={isSubmitting || !csvText.trim()}
                    className="btn-notion-primary text-xs px-4 py-1.5 cursor-pointer"
                  >
                    {isSubmitting ? 'Importing CSV...' : 'Import CSV Data'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: RESET */}
          {activeTab === 'RESET' && (
            <div className="p-4 rounded-[10px] border border-[#e03131]/30 bg-[#fde0ec]/30 dark:bg-[#3d1226]/30 space-y-3">
              <div className="flex items-center gap-2 text-[#e03131]">
                <Trash2 className="h-4 w-4" />
                <h4 className="text-xs font-bold">Clear All Curriculum Courses</h4>
              </div>
              <p className="text-xs text-[#5d5b54] dark:text-[#a4a097]">
                This will remove all defined curriculum catalog courses, prerequisite relations, and next-semester planned courses from your degree program.
                Your actual semester course records and grades will NOT be deleted.
              </p>
              <button
                type="button"
                onClick={handleClear}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-[8px] bg-[#e03131] hover:bg-[#c92a2a] text-white text-xs font-semibold cursor-pointer transition-colors"
              >
                {isSubmitting ? 'Clearing Catalog...' : 'Delete All Curriculum Courses'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
