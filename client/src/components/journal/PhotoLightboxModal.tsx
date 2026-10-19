import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Download,
  Trash2,
  Edit2,
  Check,
  Calendar,
  BookOpen,
  MapPin,
  User,
  Plus,
  Loader2,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { api } from '../../lib/api';
import { formatDate, formatBytes } from '../../lib/utils';
import { ClassPhoto, ClassSession } from '../../types';

interface PhotoLightboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: ClassSession;
  initialPhotoIndex?: number;
  onPhotoDeleted?: (photoId: string) => void;
  onPhotoUpdated?: (updatedPhoto: ClassPhoto) => void;
  onAddMorePhotos?: (session: ClassSession) => void;
}

export const PhotoLightboxModal: React.FC<PhotoLightboxModalProps> = ({
  isOpen,
  onClose,
  session,
  initialPhotoIndex = 0,
  onPhotoDeleted,
  onPhotoUpdated,
  onAddMorePhotos,
}) => {
  const photos = session.photos || [];
  const [currentIndex, setCurrentIndex] = useState(initialPhotoIndex);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isEditingCaption, setIsEditingCaption] = useState(false);
  const [captionInput, setCaptionInput] = useState('');
  const [isSavingCaption, setIsSavingCaption] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(Math.min(Math.max(0, initialPhotoIndex), Math.max(0, photos.length - 1)));
      setZoomLevel(1);
      setIsEditingCaption(false);
      setShowDeleteConfirm(false);
      setImageLoaded(false);
    }
  }, [isOpen, initialPhotoIndex, photos.length]);

  const activePhoto = photos[currentIndex];

  useEffect(() => {
    if (activePhoto) {
      setCaptionInput(activePhoto.caption || '');
      setZoomLevel(1);
      setImageLoaded(false);
    }
  }, [activePhoto?.id]);

  const handlePrev = useCallback(() => {
    if (photos.length <= 1) return;
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1));
  }, [photos.length]);

  const handleNext = useCallback(() => {
    if (photos.length <= 1) return;
    setCurrentIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0));
  }, [photos.length]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isEditingCaption) return;

      if (e.key === 'Escape') {
        if (showDeleteConfirm) {
          setShowDeleteConfirm(false);
        } else {
          onClose();
        }
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === '+' || e.key === '=') {
        setZoomLevel((z) => Math.min(z + 0.25, 3));
      } else if (e.key === '-' || e.key === '_') {
        setZoomLevel((z) => Math.max(z - 0.25, 0.5));
      } else if (e.key === '0') {
        setZoomLevel(1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isEditingCaption, showDeleteConfirm, handlePrev, handleNext, onClose]);

  const handleSaveCaption = async () => {
    if (!activePhoto) return;
    setIsSavingCaption(true);
    try {
      const updated = await api.updateClassPhoto(activePhoto.id, {
        caption: captionInput.trim() || null,
      });
      setIsEditingCaption(false);
      onPhotoUpdated?.(updated);
    } catch (err) {
      console.error('Failed to update photo caption:', err);
    } finally {
      setIsSavingCaption(false);
    }
  };

  const handleDeletePhoto = async () => {
    if (!activePhoto) return;
    setIsDeleting(true);
    try {
      await api.deleteClassPhoto(activePhoto.id);
      setShowDeleteConfirm(false);
      onPhotoDeleted?.(activePhoto.id);

      if (photos.length <= 1) {
        onClose();
      } else if (currentIndex >= photos.length - 1) {
        setCurrentIndex(photos.length - 2);
      }
    } catch (err) {
      console.error('Failed to delete photo:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  if (!isOpen || !activePhoto) return null;

  const photoFileUrl = api.getClassPhotoFileUrl(activePhoto.id);
  const downloadUrl = api.getClassPhotoFileUrl(activePhoto.id, true);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/95 text-white backdrop-blur-md animate-in fade-in duration-200 select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget && !showDeleteConfirm) onClose();
      }}
    >
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/60 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <span
            className="px-2.5 py-1 text-xs font-semibold rounded-[6px] text-white shrink-0 shadow-xs"
            style={{ backgroundColor: session.course?.color || '#5645d4' }}
          >
            {session.course?.code || 'COURSE'}
          </span>
          <div className="truncate">
            <h2 className="text-sm font-semibold text-slate-100 truncate">
              {session.topic}
            </h2>
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatDate(session.sessionDate)}
              </span>
              {session.course?.title && (
                <span className="hidden sm:inline-block truncate">
                  • {session.course.title}
                </span>
              )}
              {session.roomNumber && (
                <span className="hidden md:inline-flex items-center gap-1">
                  • <MapPin className="h-3 w-3" /> {session.roomNumber}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Counter and Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-slate-400 mr-2 font-mono">
            {currentIndex + 1} / {photos.length}
          </span>

          {/* Zoom In */}
          <button
            onClick={() => setZoomLevel((z) => Math.min(z + 0.25, 3))}
            title="Zoom In (+)"
            className="p-1.5 rounded-[6px] text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <ZoomIn className="h-4 w-4" />
          </button>

          {/* Zoom Out */}
          <button
            onClick={() => setZoomLevel((z) => Math.max(z - 0.25, 0.5))}
            title="Zoom Out (-)"
            className="p-1.5 rounded-[6px] text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <ZoomOut className="h-4 w-4" />
          </button>

          {/* Reset Zoom */}
          {zoomLevel !== 1 && (
            <button
              onClick={() => setZoomLevel(1)}
              title="Reset Zoom (0)"
              className="p-1.5 rounded-[6px] text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          )}

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            title="Toggle Fullscreen"
            className="p-1.5 rounded-[6px] text-slate-300 hover:text-white hover:bg-white/10 transition-colors hidden sm:inline-flex"
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>

          {/* Download Original */}
          <a
            href={downloadUrl}
            download={activePhoto.originalFilename}
            title="Download Original Board Photo"
            className="p-1.5 rounded-[6px] text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <Download className="h-4 w-4" />
          </a>

          {/* Add More Photos */}
          {onAddMorePhotos && (
            <button
              onClick={() => onAddMorePhotos(session)}
              title="Add more photos to this session"
              className="p-1.5 rounded-[6px] text-slate-300 hover:text-white hover:bg-white/10 transition-colors hidden sm:inline-flex"
            >
              <Plus className="h-4 w-4" />
            </button>
          )}

          {/* Delete Photo */}
          <button
            onClick={() => setShowDeleteConfirm(true)}
            title="Delete this photo"
            className="p-1.5 rounded-[6px] text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>

          {/* Close */}
          <button
            onClick={onClose}
            title="Close Viewer (Esc)"
            className="p-1.5 rounded-[6px] text-slate-300 hover:text-white hover:bg-white/10 transition-colors ml-2"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Main Image Stage */}
      <div className="relative flex-1 flex items-center justify-center overflow-hidden p-2 sm:p-6">
        {/* Loading Spinner */}
        {!imageLoaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#5645d4]" />
          </div>
        )}

        {/* The Photo */}
        <div
          className="relative max-h-full max-w-full flex items-center justify-center transition-transform duration-150 ease-out cursor-grab active:cursor-grabbing"
          style={{
            transform: `scale(${zoomLevel})`,
          }}
        >
          <img
            key={activePhoto.id}
            src={photoFileUrl}
            alt={activePhoto.caption || activePhoto.originalFilename}
            onLoad={() => setImageLoaded(true)}
            className={`max-h-[calc(100vh-180px)] max-w-[94vw] object-contain rounded-[8px] shadow-2xl transition-opacity duration-200 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            draggable={false}
          />
        </div>

        {/* Previous Navigation Arrow */}
        {photos.length > 1 && (
          <button
            onClick={handlePrev}
            aria-label="Previous photo"
            className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/50 hover:bg-black/80 text-white/80 hover:text-white border border-white/10 backdrop-blur-xs transition-all hover:scale-105"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}

        {/* Next Navigation Arrow */}
        {photos.length > 1 && (
          <button
            onClick={handleNext}
            aria-label="Next photo"
            className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/50 hover:bg-black/80 text-white/80 hover:text-white border border-white/10 backdrop-blur-xs transition-all hover:scale-105"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        )}
      </div>

      {/* Bottom Bar: Caption and Metadata */}
      <div className="bg-black/80 border-t border-white/10 px-4 py-3 shrink-0">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Caption Display or Edit */}
          <div className="flex-1 min-w-0">
            {isEditingCaption ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={captionInput}
                  onChange={(e) => setCaptionInput(e.target.value)}
                  placeholder="Enter a caption for this board photo..."
                  className="flex-1 bg-white/10 border border-white/20 rounded-[6px] px-3 py-1.5 text-sm text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-[#5645d4]"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveCaption();
                    if (e.key === 'Escape') setIsEditingCaption(false);
                  }}
                />
                <button
                  onClick={handleSaveCaption}
                  disabled={isSavingCaption}
                  className="px-3 py-1.5 bg-[#5645d4] hover:bg-[#4636b8] text-white text-xs font-medium rounded-[6px] flex items-center gap-1 transition-colors"
                >
                  {isSavingCaption ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  Save
                </button>
                <button
                  onClick={() => setIsEditingCaption(false)}
                  className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-xs text-slate-300 rounded-[6px] transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group">
                <p className="text-sm text-slate-200 font-medium">
                  {activePhoto.caption || (
                    <span className="text-slate-500 italic">No caption added yet.</span>
                  )}
                </p>
                <button
                  onClick={() => setIsEditingCaption(true)}
                  title="Edit Caption"
                  className="p-1 rounded-[4px] text-slate-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* Technical Metadata */}
            <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1 font-mono">
              <span>{activePhoto.originalFilename}</span>
              <span>•</span>
              <span>{formatBytes(activePhoto.fileSize)}</span>
              {activePhoto.width && activePhoto.height && (
                <>
                  <span>•</span>
                  <span>{activePhoto.width} × {activePhoto.height} px</span>
                </>
              )}
            </div>
          </div>

          {/* Thumbnail Strip */}
          {photos.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto py-1 max-w-full sm:max-w-xs shrink-0 scrollbar-none">
              {photos.map((photo, idx) => (
                <button
                  key={photo.id}
                  onClick={() => setCurrentIndex(idx)}
                  className={`relative w-12 h-10 rounded-[4px] overflow-hidden border-2 shrink-0 transition-all ${
                    idx === currentIndex
                      ? 'border-[#5645d4] scale-105 shadow-md'
                      : 'border-white/20 opacity-60 hover:opacity-100'
                  }`}
                >
                  <img
                    src={api.getClassPhotoFileUrl(photo.id)}
                    alt=""
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal Overlay */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-[12px] bg-slate-900 border border-slate-800 p-6 shadow-2xl text-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-base font-semibold text-white">Delete Board Photo?</h3>
            <p className="mt-2 text-xs text-slate-400">
              Are you sure you want to delete this board photo? This file will be permanently removed from your storage.
            </p>
            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-3.5 py-1.5 rounded-[8px] text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeletePhoto}
                disabled={isDeleting}
                className="px-3.5 py-1.5 rounded-[8px] text-xs font-medium bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-1.5 shadow-sm transition-colors"
              >
                {isDeleting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Delete Photo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
