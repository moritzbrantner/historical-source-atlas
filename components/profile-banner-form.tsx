'use client';

import Image from 'next/image';
import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { useRouter } from '@/i18n/navigation';
import { readProblemDetail } from '@/src/http/problem-client';
import { bannerImageConstraints } from '@/src/profile/image-validation';

type ProfileBannerFormProps = {
  currentImage: string | null;
  labels: {
    upload: string;
    uploading: string;
    remove: string;
    chooseImage: string;
    hint: string;
    success: string;
    empty: string;
    alt: string;
    ready: string;
  };
};

export function ProfileBannerForm({
  currentImage,
  labels,
}: ProfileBannerFormProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [state, setState] = useState<{ error?: string; success?: boolean }>({});

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedFile) {
      setState({ error: 'Please choose a banner image before uploading.' });
      return;
    }

    setPending(true);
    setState({});
    const formData = new FormData();
    formData.set('image', selectedFile);

    const response = await fetch('/api/profile/banner', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const problem = await readProblemDetail(
        response,
        'Unable to update profile banner right now. Please try again.',
      );
      setState({ error: problem.message });
      setPending(false);
      return;
    }

    setState({ success: true });
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setPending(false);
    router.refresh();
  }

  async function handleRemove() {
    setPending(true);
    setState({});

    const response = await fetch('/api/profile/banner/remove', {
      method: 'POST',
    });

    if (!response.ok) {
      const problem = await readProblemDetail(
        response,
        'Unable to update profile banner right now. Please try again.',
      );
      setState({ error: problem.message });
      setPending(false);
      return;
    }

    setPending(false);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setSelectedFile(null);
    router.refresh();
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0] ?? null;

    if (!file) {
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setState({});
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  const imageToRender = previewUrl ?? currentImage;

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="relative aspect-[3/1] w-full overflow-hidden rounded-lg border border-zinc-300 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900">
          {imageToRender ? (
            <Image
              src={imageToRender}
              alt={labels.alt}
              fill
              sizes="(min-width: 1024px) 896px, calc(100vw - 48px)"
              unoptimized
              className="object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-zinc-500">
              {labels.empty}
            </div>
          )}
        </div>

        {currentImage ? (
          <Button
            type="button"
            variant="ghost"
            onClick={() => void handleRemove()}
            disabled={pending}
          >
            {labels.remove}
          </Button>
        ) : null}
      </div>

      <form onSubmit={handleUpload} className="space-y-3">
        <div className="space-y-2">
          <label htmlFor="banner-image" className="text-sm font-medium">
            {labels.chooseImage}
          </label>
          <input
            id="banner-image"
            name="image"
            type="file"
            accept="image/png,image/jpeg"
            className="block w-full rounded-md border border-zinc-300 p-2 text-sm dark:border-zinc-700"
            onChange={handleFileChange}
          />
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {labels.hint}
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {`Max ${(bannerImageConstraints.maxUploadBytes / (1024 * 1024)).toFixed(0)}MB · ${bannerImageConstraints.minWidthPx}x${bannerImageConstraints.minHeightPx}-${bannerImageConstraints.maxWidthPx}x${bannerImageConstraints.maxHeightPx}px`}
          </p>
          {selectedFile ? (
            <p className="text-xs text-emerald-600 dark:text-emerald-400">
              {labels.ready}
            </p>
          ) : null}
        </div>

        <Button type="submit" disabled={pending || !selectedFile}>
          {pending ? labels.uploading : labels.upload}
        </Button>

        {state.error ? (
          <p className="text-sm text-red-600 dark:text-red-400">
            {state.error}
          </p>
        ) : null}
        {state.success ? (
          <p className="text-sm text-emerald-600 dark:text-emerald-400">
            {labels.success}
          </p>
        ) : null}
      </form>
    </div>
  );
}
