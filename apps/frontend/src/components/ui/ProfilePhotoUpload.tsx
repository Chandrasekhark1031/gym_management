import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, ImageIcon } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';
import { ErrorState } from './PageStates';
import { GALLERY_ACCEPT, validateImageFile } from '../../utils/imageValidation';
import { assetUrl } from '../../services/gymService';

type Step = 'idle' | 'options' | 'camera' | 'preview';

interface ProfilePhotoUploadProps {
  photoUrl?: string | null;
  label?: string;
  disabled?: boolean;
  onUpload: (file: File) => Promise<{ photoUrl: string }>;
  onPhotoUpdated: (photoUrl: string) => void;
}

export default function ProfilePhotoUpload({
  photoUrl,
  label = 'Profile photo',
  disabled,
  onUpload,
  onPhotoUpdated,
}: ProfilePhotoUploadProps) {
  const [step, setStep] = useState<Step>('idle');
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [cameraError, setCameraError] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      stopCamera();
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [stopCamera, previewUrl]);

  const resetPreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPreviewFile(null);
    setError('');
  };

  const closeAll = () => {
    stopCamera();
    resetPreview();
    setCameraError('');
    setStep('idle');
  };

  const openOptions = () => {
    if (disabled) return;
    setError('');
    setStep('options');
  };

  const pickFile = (file?: File) => {
    if (!file) return;
    const validationError = validateImageFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    resetPreview();
    setPreviewFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setStep('preview');
  };

  const startCamera = async () => {
    setStep('camera');
    setCameraError('');
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Camera is not supported in this browser. Please use Choose from Gallery.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch {
      setCameraError('Camera permission denied or unavailable. You can retry or use Choose from Gallery.');
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setError('Could not capture photo. Please try again.');
          return;
        }
        stopCamera();
        pickFile(new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' }));
      },
      'image/jpeg',
      0.92
    );
  };

  const confirmUpload = async () => {
    if (!previewFile || uploading) return;
    setUploading(true);
    setError('');
    try {
      const result = await onUpload(previewFile);
      onPhotoUpdated(result.photoUrl);
      closeAll();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <p className="text-sm font-medium text-gray-700 mb-2">{label}</p>
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-8">
        <div className="relative shrink-0">
          {photoUrl ? (
            <img
              src={assetUrl(photoUrl)}
              alt="Profile photo"
              className="w-58 h-60 rounded-2xl object-cover shadow-sm border-2 border-gray-300"
            />
          ) : (
            <div className="w-58 h-60 rounded-2xl bg-gray-100 border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 gap-1">
              <ImageIcon size={32} />
              <span className="text-xs font-medium text-gray-400">No Photo</span>
            </div>
          )}
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={openOptions}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transition-colors"
          aria-label="Change profile photo"
        >
          <Camera size={16} className="text-gray-500" />
          <span>Change photo</span>
        </button>
      </div>

      <Modal open={step === 'options'} title="Photo options" onClose={closeAll} footer={
        <Button variant="secondary" onClick={closeAll}>Cancel</Button>
      }>
        <div className="space-y-2">
          <Button type="button" className="w-full justify-center" onClick={() => { setStep('idle'); startCamera(); }}>
            <Camera size={16} className="mr-2 inline" /> Take Photo
          </Button>
          <Button type="button" variant="secondary" className="w-full justify-center" onClick={() => galleryRef.current?.click()}>
            <ImageIcon size={16} className="mr-2 inline" /> Choose from Gallery
          </Button>
          <input
            ref={galleryRef}
            type="file"
            accept={GALLERY_ACCEPT}
            className="sr-only"
            onChange={(e) => {
              pickFile(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </div>
      </Modal>

      <Modal open={step === 'camera'} title="Take photo" onClose={() => { stopCamera(); setStep('options'); }} footer={
        <>
          <Button variant="secondary" onClick={() => { stopCamera(); setStep('options'); }}>Cancel</Button>
          <Button type="button" onClick={capturePhoto} disabled={!!cameraError}>Capture</Button>
        </>
      }>
        <div className="space-y-3">
          {cameraError ? (
            <div className="space-y-3">
              <ErrorState message={cameraError} />
              <Button type="button" variant="secondary" onClick={startCamera}>Retry camera</Button>
            </div>
          ) : (
            <video ref={videoRef} className="w-full max-h-[50vh] rounded-md bg-black object-contain" playsInline muted />
          )}
        </div>
      </Modal>

      <Modal open={step === 'preview'} title="Preview photo" onClose={() => { resetPreview(); setStep('options'); }} footer={
        <>
          <Button variant="secondary" onClick={() => { resetPreview(); setStep('options'); }} disabled={uploading}>Cancel</Button>
          <Button loading={uploading} onClick={confirmUpload}>Confirm upload</Button>
        </>
      }>
        <div className="space-y-3">
          {previewUrl && (
            <img src={previewUrl} alt="Preview" className="mx-auto max-h-[50vh] rounded-md object-contain" />
          )}
          {error && <ErrorState message={error} />}
        </div>
      </Modal>
    </div>
  );
}
