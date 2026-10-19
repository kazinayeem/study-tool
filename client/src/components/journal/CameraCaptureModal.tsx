import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, X, RotateCcw, CheckCircle2, AlertCircle, ImageIcon, SwitchCamera } from 'lucide-react';

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Receives the captured (or fallback-selected) JPEG/PNG file. */
  onCapture: (file: File) => void;
  title?: string;
}

type CaptureStatus = 'initializing' | 'ready' | 'error';

const mapCameraError = (err: any): string => {
  const name = err?.name || '';
  switch (name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'Camera permission was denied. Allow camera access in your browser settings and try again.';
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return 'No camera was found on this device. You can upload a photo from your computer instead.';
    case 'NotReadableError':
    case 'TrackStartError':
      return 'Your camera is already in use by another application. Close it and try again.';
    case 'OverconstrainedError':
      return 'The requested camera settings are not supported on this device.';
    default:
      return err?.message || 'Unable to start the camera.';
  }
};

export const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({
  isOpen,
  onClose,
  onCapture,
  title = 'Capture Board Photo',
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fallbackInputRef = useRef<HTMLInputElement>(null);

  const [status, setStatus] = useState<CaptureStatus>('initializing');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const clearCaptured = useCallback(() => {
    setCapturedFile(null);
    setCapturedUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }, []);

  // Start (or restart) the live camera stream whenever the modal is open.
  useEffect(() => {
    if (!isOpen) {
      stopStream();
      return;
    }

    let cancelled = false;
    setStatus('initializing');
    setErrorMessage(null);

    const start = async () => {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        if (cancelled) return;
        setStatus('error');
        setErrorMessage(
          'Camera access is unavailable. This usually means the page is not served over HTTPS or the browser blocks the camera API.'
        );
        return;
      }

      try {
        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
              facingMode,
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
          });
        } catch (firstErr: any) {
          // Retry with relaxed constraints for devices (e.g. desktop webcams)
          // that reject facingMode / resolution hints.
          if (
            firstErr?.name === 'OverconstrainedError' ||
            firstErr?.name === 'NotFoundError'
          ) {
            stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: true });
          } else {
            throw firstErr;
          }
        }

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }
        setStatus('ready');
      } catch (err: any) {
        if (cancelled) return;
        setStatus('error');
        setErrorMessage(mapCameraError(err));
      }
    };

    start();

    return () => {
      cancelled = true;
      stopStream();
    };
  }, [isOpen, facingMode, stopStream]);

  // Fully tear down the camera + object URLs on unmount.
  useEffect(
    () => () => {
      stopStream();
      setCapturedUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    },
    [stopStream]
  );

  const handleCapture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || status !== 'ready') return;

    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setErrorMessage('Unable to process the captured frame.');
      return;
    }
    ctx.drawImage(video, 0, 0, width, height);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setErrorMessage('Failed to encode the captured photo.');
          return;
        }
        const file = new File([blob], `board-photo-${Date.now()}.jpg`, {
          type: 'image/jpeg',
        });
        setCapturedFile(file);
        setCapturedUrl(URL.createObjectURL(blob));
      },
      'image/jpeg',
      0.92
    );
  };

  const handleRetake = () => {
    clearCaptured();
    if (videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => undefined);
    }
  };

  const handleSave = () => {
    if (!capturedFile) return;
    onCapture(capturedFile);
    clearCaptured();
    onClose();
  };

  const handleFallbackFile = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    onCapture(file);
    if (fallbackInputRef.current) fallbackInputRef.current.value = '';
    onClose();
  };

  const handleClose = () => {
    clearCaptured();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        className="w-full max-w-2xl bg-white dark:bg-[#18181b] rounded-[12px] border border-[#e5e3df] dark:border-[#27272a] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#e5e3df] dark:border-[#27272a] bg-[#fbfbfa] dark:bg-[#1e1e24] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-[8px] bg-[#5645d4]/10 text-[#5645d4] dark:bg-[#5645d4]/20 dark:text-[#8070f6]">
              <Camera className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Frame the whiteboard, then capture a still photo
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-[8px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {errorMessage && status === 'error' && (
            <div className="flex items-start gap-2.5 p-3 rounded-[8px] bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="flex-1">{errorMessage}</div>
            </div>
          )}

          {/* Preview surface */}
          <div className="relative w-full aspect-video rounded-[10px] overflow-hidden bg-black border border-[#27272a]">
            {capturedUrl ? (
              <img src={capturedUrl} alt="Captured board" className="w-full h-full object-contain" />
            ) : (
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className={`w-full h-full object-cover ${status === 'ready' ? 'opacity-100' : 'opacity-0'}`}
              />
            )}

            {status === 'initializing' && !capturedUrl && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-300 text-xs">
                <Camera className="h-8 w-8 animate-pulse" />
                <span>Starting camera…</span>
              </div>
            )}

            {status === 'error' && !capturedUrl && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs px-6 text-center">
                <AlertCircle className="h-8 w-8" />
                <span>Camera preview unavailable</span>
              </div>
            )}

            {capturedUrl && (
              <span className="absolute top-2 left-2 px-2 py-0.5 rounded-[4px] bg-emerald-600 text-white text-[10px] font-semibold flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Captured
              </span>
            )}
          </div>

          <canvas ref={canvasRef} className="hidden" />

          {/* Camera controls */}
          {!capturedUrl ? (
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleCapture}
                disabled={status !== 'ready'}
                className="px-5 py-2.5 rounded-[8px] text-xs font-semibold bg-[#5645d4] hover:bg-[#4636b8] text-white shadow-sm flex items-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Camera className="h-4 w-4" />
                Capture Photo
              </button>

              <button
                type="button"
                onClick={() => setFacingMode((m) => (m === 'user' ? 'environment' : 'user'))}
                disabled={status === 'initializing'}
                className="px-3.5 py-2.5 rounded-[8px] text-xs font-medium border border-[#e5e3df] dark:border-[#27272a] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                title="Switch between front and rear camera"
              >
                <SwitchCamera className="h-4 w-4" />
                Flip
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleRetake}
                className="px-4 py-2.5 rounded-[8px] text-xs font-medium border border-[#e5e3df] dark:border-[#27272a] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5"
              >
                <RotateCcw className="h-4 w-4" />
                Retake
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-5 py-2.5 rounded-[8px] text-xs font-semibold bg-[#5645d4] hover:bg-[#4636b8] text-white shadow-sm flex items-center gap-2 transition-all active:scale-[0.98]"
              >
                <CheckCircle2 className="h-4 w-4" />
                Use This Photo
              </button>
            </div>
          )}

          {/* Fallback: file picker (uses mobile capture attribute where supported) */}
          <div className="pt-3 border-t border-[#e5e3df] dark:border-[#27272a] text-center">
            <input
              ref={fallbackInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              onChange={(e) => handleFallbackFile(e.target.files)}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fallbackInputRef.current?.click()}
              className="text-[11px] font-medium text-[#5645d4] dark:text-[#8070f6] hover:underline inline-flex items-center gap-1.5"
            >
              <ImageIcon className="h-3.5 w-3.5" />
              Trouble with the camera? Upload a photo instead
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
