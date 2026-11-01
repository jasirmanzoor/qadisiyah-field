'use client';

import { useEffect, useRef, useState } from 'react';
import { v4 as uuid } from 'uuid';
import { deletePhoto, getPhotosForDealership, savePhoto } from '@/lib/db';
import type { Photo } from '@/lib/types';

const MAX_DIM = 1600;
const JPEG_QUALITY = 0.72;

async function compressImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DIM / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, w, h);
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob ?? file), 'image/jpeg', JPEG_QUALITY);
  });
}

function getGeotag(): Promise<{ lat: number | null; lng: number | null }> {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) return resolve({ lat: null, lng: null });
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve({ lat: null, lng: null }),
      { timeout: 4000 }
    );
  });
}

export default function PhotoCapture({
  dealershipId,
  onCountChange,
}: {
  dealershipId: string;
  onCountChange: (count: number) => void;
}) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const list = await getPhotosForDealership(dealershipId);
    setPhotos(list);
    onCountChange(list.length);
  };

  useEffect(() => {
    (async () => {
      const list = await getPhotosForDealership(dealershipId);
      setPhotos(list);
      onCountChange(list.length);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dealershipId]);

  useEffect(() => {
    const next: Record<string, string> = {};
    for (const p of photos) next[p.id] = URL.createObjectURL(p.blob);
    // Object URLs are a side effect of `photos` changing; there is no way to
    // derive them during render, so this state update in an effect is required.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUrls(next);
    return () => {
      Object.values(next).forEach((u) => URL.revokeObjectURL(u));
    };
  }, [photos]);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    const geo = await getGeotag();
    for (const file of Array.from(files)) {
      const blob = await compressImage(file);
      const photo: Photo = {
        id: uuid(),
        dealershipId,
        blob,
        takenAt: new Date().toISOString(),
        lat: geo.lat,
        lng: geo.lng,
      };
      await savePhoto(photo);
    }
    await load();
    setUploading(false);
    if (inputRef.current) inputRef.current.value = '';
  };

  const remove = async (id: string) => {
    await deletePhoto(id);
    await load();
  };

  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        {photos.map((p) => (
          <div key={p.id} className="group relative aspect-square overflow-hidden rounded-xl bg-surface-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={urls[p.id]} alt="Dealership photo" className="h-full w-full object-cover" />
            {p.lat && (
              <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1 text-[9px] text-white">📍 geotagged</span>
            )}
            <button
              type="button"
              onClick={() => remove(p.id)}
              className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-xs text-white"
            >
              ✕
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-border text-muted"
        >
          <span className="text-xl">{uploading ? '⏳' : '📷'}</span>
          <span className="text-xs">{uploading ? 'Saving…' : 'Add photo'}</span>
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}
