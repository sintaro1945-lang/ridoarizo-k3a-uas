import React, { useRef, useState, useEffect } from 'react';
import { Camera, RefreshCw, Check, X } from 'lucide-react';

interface SelfieCameraModalProps {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  onCapture: (imageSrc: string) => void;
}

export default function SelfieCameraModal({ title, isOpen, onClose, onCapture }: SelfieCameraModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCapturedImage(null);
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    setError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.error('Camera error:', err);
      setError('Tidak dapat mengakses kamera. Pastikan izin kamera diaktifkan di browser.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const takeSnapshot = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 480;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setCapturedImage(dataUrl);
      }
    }
  };

  const retake = () => {
    setCapturedImage(null);
  };

  const confirmCapture = () => {
    if (capturedImage) {
      stopCamera();
      onCapture(capturedImage);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl text-white">
        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <Camera className="w-5 h-5 text-blue-400" />
            {title}
          </h3>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 flex flex-col items-center">
          {error ? (
            <div className="w-full bg-red-500/20 border border-red-500/40 rounded-2xl p-6 text-center text-red-200">
              <p>{error}</p>
              <button
                onClick={startCamera}
                className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl font-medium text-sm transition-colors"
              >
                Coba Lagi
              </button>
            </div>
          ) : (
            <div className="relative w-full aspect-square bg-black rounded-2xl overflow-hidden shadow-inner border border-slate-800">
              {capturedImage ? (
                <img src={capturedImage} alt="Selfie preview" className="w-full h-full object-cover" />
              ) : (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover -scale-x-100"
                />
              )}
              <canvas ref={canvasRef} className="hidden" />
            </div>
          )}

          <p className="text-xs text-slate-400 text-center mt-4">
            {capturedImage
              ? 'Pastikan wajah Anda terlihat jelas sebelum konfirmasi.'
              : 'Posisikan wajah Anda di dalam frame untuk verifikasi kehadiran.'}
          </p>
        </div>

        <div className="p-4 border-t border-slate-800 bg-slate-950/50 flex gap-3">
          {capturedImage ? (
            <>
              <button
                onClick={retake}
                className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-700 font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors text-sm"
              >
                <RefreshCw className="w-4 h-4" /> Ulangi Foto
              </button>
              <button
                onClick={confirmCapture}
                className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-500 font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors text-sm shadow-lg shadow-blue-600/30"
              >
                <Check className="w-4 h-4" /> Gunakan Foto
              </button>
            </>
          ) : (
            <button
              onClick={takeSnapshot}
              disabled={!!error}
              className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 font-bold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg shadow-blue-600/30 text-base"
            >
              <Camera className="w-5 h-5" /> Ambil Foto Selfie
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
