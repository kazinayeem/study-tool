import React, { useState, useEffect } from 'react';
import { X, Plus, AlertCircle } from 'lucide-react';
import { CurriculumCourse } from '../../../types';

interface AddCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (courseData: {
    code: string;
    title: string;
    credits: number;
    category: string;
    isRequired: boolean;
    recommendedSemester: number | null;
    minPassingGrade: string;
    description?: string;
    prerequisiteCodes: string[];
  }) => Promise<void>;
  existingCourses: CurriculumCourse[];
  initialData?: CurriculumCourse | null;
}

export const AddCourseModal: React.FC<AddCourseModalProps> = ({
  isOpen,
  onClose,
  onSave,
  existingCourses,
  initialData,
}) => {
  const [code, setCode] = useState('');
  const [title, setTitle] = useState('');
  const [credits, setCredits] = useState(3.0);
  const [category, setCategory] = useState('CORE');
  const [isRequired, setIsRequired] = useState(true);
  const [recommendedSemester, setRecommendedSemester] = useState<number | ''>(1);
  const [minPassingGrade, setMinPassingGrade] = useState('D');
  const [description, setDescription] = useState('');
  const [selectedPrereqCodes, setSelectedPrereqCodes] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setCode(initialData.code);
      setTitle(initialData.title);
      setCredits(initialData.credits);
      setCategory(initialData.category || 'CORE');
      setIsRequired(initialData.isRequired);
      setRecommendedSemester(initialData.recommendedSemester ?? '');
      setMinPassingGrade(initialData.minPassingGrade || 'D');
      setDescription(initialData.description || '');
      setSelectedPrereqCodes(initialData.prerequisites?.map((p) => p.code) || []);
    } else {
      setCode('');
      setTitle('');
      setCredits(3.0);
      setCategory('CORE');
      setIsRequired(true);
      setRecommendedSemester(1);
      setMinPassingGrade('D');
      setDescription('');
      setSelectedPrereqCodes([]);
    }
    setError(null);
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const togglePrereq = (pCode: string) => {
    setSelectedPrereqCodes((prev) =>
      prev.includes(pCode) ? prev.filter((c) => c !== pCode) : [...prev, pCode]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !title.trim()) {
      setError('Course code and title are required');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSave({
        code: code.trim().toUpperCase(),
        title: title.trim(),
        credits: Number(credits) || 3.0,
        category,
        isRequired,
        recommendedSemester: recommendedSemester !== '' ? Number(recommendedSemester) : null,
        minPassingGrade,
        description: description.trim() || undefined,
        prerequisiteCodes: selectedPrereqCodes,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save curriculum course');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter out self from available prerequisites
  const availablePrereqCourses = existingCourses.filter(
    (c) => c.code.toUpperCase() !== code.trim().toUpperCase()
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="w-full max-w-lg rounded-[12px] border border-[#e5e3df] bg-white dark:border-[#2a2a2e] dark:bg-[#1a1a1e] shadow-xl overflow-hidden max-h-[90vh] flex flex-col text-[#37352f] dark:text-[#f0eeec]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#e5e3df] dark:border-[#2a2a2e] px-5 py-4">
          <div>
            <h3 className="text-base font-semibold text-[#1a1a1a] dark:text-white">
              {initialData ? 'Edit Curriculum Course' : 'Add Curriculum Course'}
            </h3>
            <p className="text-xs text-[#787671] dark:text-[#a4a097]">
              Specify university requirements and prerequisite rules
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-[6px] p-1 text-[#787671] hover:bg-[#f0eeec] dark:hover:bg-[#252528] dark:text-[#a4a097]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-[8px] bg-[#fde0ec] border border-[#e03131]/30 text-xs text-[#e03131] flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1">
              <label className="block text-[11px] font-semibold text-[#5d5b54] dark:text-[#a4a097] mb-1">
                Course Code *
              </label>
              <input
                type="text"
                placeholder="e.g. CSE215"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full rounded-[8px] border border-[#c8c4be] bg-white px-3 py-1.5 text-xs font-semibold uppercase text-[#1a1a1a] dark:border-[#37352f] dark:bg-[#141416] dark:text-white focus:outline-none focus:border-[#5645d4]"
                required
              />
            </div>
            <div className="col-span-2">
              <label className="block text-[11px] font-semibold text-[#5d5b54] dark:text-[#a4a097] mb-1">
                Course Title *
              </label>
              <input
                type="text"
                placeholder="e.g. Object Oriented Programming"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-[8px] border border-[#c8c4be] bg-white px-3 py-1.5 text-xs text-[#1a1a1a] dark:border-[#37352f] dark:bg-[#141416] dark:text-white focus:outline-none focus:border-[#5645d4]"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-[#5d5b54] dark:text-[#a4a097] mb-1">
                Credits
              </label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                max="12"
                value={credits}
                onChange={(e) => setCredits(parseFloat(e.target.value) || 0)}
                className="w-full rounded-[8px] border border-[#c8c4be] bg-white px-3 py-1.5 text-xs text-[#1a1a1a] dark:border-[#37352f] dark:bg-[#141416] dark:text-white focus:outline-none focus:border-[#5645d4]"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#5d5b54] dark:text-[#a4a097] mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-[8px] border border-[#c8c4be] bg-white px-3 py-1.5 text-xs text-[#1a1a1a] dark:border-[#37352f] dark:bg-[#141416] dark:text-white focus:outline-none focus:border-[#5645d4]"
              >
                <option value="CORE">Core</option>
                <option value="ELECTIVE">Elective</option>
                <option value="GENERAL_EDUCATION">General Education</option>
                <option value="BASIC_SCIENCE">Basic Science / Math</option>
                <option value="LAB">Laboratory</option>
                <option value="CAPSTONE">Capstone / Thesis</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#5d5b54] dark:text-[#a4a097] mb-1">
                Rec. Semester
              </label>
              <input
                type="number"
                min="1"
                max="16"
                placeholder="e.g. 3"
                value={recommendedSemester}
                onChange={(e) => setRecommendedSemester(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                className="w-full rounded-[8px] border border-[#c8c4be] bg-white px-3 py-1.5 text-xs text-[#1a1a1a] dark:border-[#37352f] dark:bg-[#141416] dark:text-white focus:outline-none focus:border-[#5645d4]"
              />
            </div>
          </div>

          <div className="flex items-center gap-6 pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-[#1a1a1a] dark:text-white">
              <input
                type="checkbox"
                checked={isRequired}
                onChange={(e) => setIsRequired(e.target.checked)}
                className="rounded border-[#c8c4be] text-[#5645d4] focus:ring-[#5645d4]"
              />
              <span>Mandatory Requirement (Core Degree)</span>
            </label>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-[#5d5b54] dark:text-[#a4a097]">
                Min Passing:
              </span>
              <select
                value={minPassingGrade}
                onChange={(e) => setMinPassingGrade(e.target.value)}
                className="rounded-[6px] border border-[#c8c4be] bg-white px-2 py-1 text-xs text-[#1a1a1a] dark:border-[#37352f] dark:bg-[#141416] dark:text-white"
              >
                <option value="D">D (Pass)</option>
                <option value="C">C (2.0)</option>
                <option value="C+">C+ (2.5)</option>
                <option value="B">B (3.0)</option>
              </select>
            </div>
          </div>

          {/* Prerequisites Selector */}
          <div className="pt-2">
            <label className="block text-[11px] font-semibold text-[#5d5b54] dark:text-[#a4a097] mb-1.5">
              Prerequisite Courses ({selectedPrereqCodes.length} selected)
            </label>
            {availablePrereqCourses.length === 0 ? (
              <p className="text-[11px] text-[#787671] italic">
                No other curriculum courses added yet. You can set prerequisites once other courses exist.
              </p>
            ) : (
              <div className="max-h-36 overflow-y-auto rounded-[8px] border border-[#e5e3df] dark:border-[#2a2a2e] p-2 space-y-1 bg-[#fbfbfa] dark:bg-[#141416]">
                {availablePrereqCourses.map((ac) => {
                  const isChecked = selectedPrereqCodes.includes(ac.code);
                  return (
                    <label
                      key={ac.id}
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-[6px] text-xs cursor-pointer transition-colors ${
                        isChecked
                          ? 'bg-[#e6e0f5] text-[#5645d4] font-medium dark:bg-[#2a1a45]'
                          : 'hover:bg-[#f0eeec] dark:hover:bg-[#252528] text-[#5d5b54] dark:text-[#a4a097]'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => togglePrereq(ac.code)}
                          className="rounded text-[#5645d4] focus:ring-[#5645d4]"
                        />
                        <span className="font-semibold">{ac.code}</span>
                        <span className="text-[11px] truncate max-w-[200px]">{ac.title}</span>
                      </span>
                      <span className="text-[10px] text-[#787671]">{ac.credits} cr</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#5d5b54] dark:text-[#a4a097] mb-1">
              Description / Notes (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="Course description or special graduation policy remarks..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-[8px] border border-[#c8c4be] bg-white px-3 py-1.5 text-xs text-[#1a1a1a] dark:border-[#37352f] dark:bg-[#141416] dark:text-white focus:outline-none focus:border-[#5645d4]"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#e5e3df] dark:border-[#2a2a2e]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="btn-notion-secondary text-xs px-3 py-1.5"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-notion-primary text-xs px-4 py-1.5 flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <span>Saving...</span>
              ) : (
                <>
                  <Plus className="h-3.5 w-3.5" />
                  <span>{initialData ? 'Update Course' : 'Add Course'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
