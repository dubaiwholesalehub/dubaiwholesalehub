"use client";

import { ChangeEvent, DragEvent, useRef, useState, useTransition } from "react";
import { CheckCircle2, ImagePlus, Loader2, Upload, X } from "lucide-react";
import { useRouter } from "next/navigation";

import { uploadWholesaleCollectionImages } from "@/app/admin/(protected)/wholesale-collections/[id]/image-actions";
import { optimizeWholesaleImage } from "@/lib/wholesale-image-optimizer";

const BATCH_SIZE = 10;
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

interface WholesaleCollectionUploaderProps {
  collectionId: string;
}

export default function WholesaleCollectionUploader({
  collectionId,
}: WholesaleCollectionUploaderProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [uploadedCount, setUploadedCount] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isPending, startTransition] = useTransition();

  function validateAndSetFiles(selected: File[]) {
    setError("");
    setSuccess("");
    setUploadedCount(0);

    if (selected.length === 0) {
      return;
    }

    for (const file of selected) {
      if (!ALLOWED_TYPES.has(file.type)) {
        setError(`${file.name} is not a supported image format.`);
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        setError(`${file.name} exceeds the 5 MB limit.`);
        return;
      }
    }

    setFiles((current) => {
      const existingKeys = new Set(
        current.map((file) => `${file.name}-${file.size}-${file.lastModified}`),
      );

      const newFiles = selected.filter(
        (file) =>
          !existingKeys.has(`${file.name}-${file.size}-${file.lastModified}`),
      );

      return [...current, ...newFiles];
    });
  }

  function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    validateAndSetFiles(Array.from(event.target.files ?? []));

    event.target.value = "";
  }

  function handleDragEnter(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();

    if (!isPending) {
      setIsDragging(true);
    }
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();

    if (!isPending) {
      event.dataTransfer.dropEffect = "copy";
      setIsDragging(true);
    }
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();

    if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
      return;
    }

    setIsDragging(false);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();

    setIsDragging(false);

    if (isPending) {
      return;
    }

    validateAndSetFiles(Array.from(event.dataTransfer.files));
  }

  function clearSelection() {
    setFiles([]);
    setError("");
    setSuccess("");
    setUploadedCount(0);

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  function uploadFiles() {
    if (files.length === 0 || isPending) {
      return;
    }

    setError("");
    setSuccess("");
    setUploadedCount(0);

    startTransition(async () => {
      let completed = 0;

      for (let start = 0; start < files.length; start += BATCH_SIZE) {
        const batch = files.slice(start, start + BATCH_SIZE);

        const formData = new FormData();

        formData.set("collectionId", collectionId);

        try {
          for (const file of batch) {
            const optimizedFile = await optimizeWholesaleImage(file);

            formData.append("images", optimizedFile);
          }
        } catch (optimizationError) {
          const message =
            optimizationError instanceof Error
              ? optimizationError.message
              : "Unknown image optimization error.";

          setError(`Unable to prepare photos for upload: ${message}`);

          setUploadedCount(completed);
          return;
        }

        const result = await uploadWholesaleCollectionImages(formData);

        if (!result.success) {
          setUploadedCount(completed);
          setError(result.message);
          router.refresh();
          return;
        }

        completed += batch.length;
        setUploadedCount(completed);
      }

      setSuccess(
        `${completed} photo${
          completed === 1 ? "" : "s"
        } uploaded successfully.`,
      );

      setFiles([]);

      if (inputRef.current) {
        inputRef.current.value = "";
      }

      router.refresh();
    });
  }

  const progress =
    files.length > 0 ? Math.round((uploadedCount / files.length) * 100) : 0;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h2 className="text-lg font-semibold text-gray-950">Upload Photos</h2>

          <p className="mt-1 text-sm text-gray-500">
            Drag and drop your product photos here, or select them from your
            computer. Large selections upload automatically in safe batches.
          </p>
        </div>

        {files.length > 0 && !isPending && (
          <button
            type="button"
            onClick={clearSelection}
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900"
          >
            <X className="h-4 w-4" />
            Clear
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        onChange={handleFiles}
        className="hidden"
      />

      <div
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`mt-5 rounded-2xl border-2 border-dashed transition ${
          isDragging
            ? "border-gray-950 bg-gray-100"
            : "border-gray-300 bg-gray-50"
        }`}
      >
        <button
          type="button"
          disabled={isPending}
          onClick={() => inputRef.current?.click()}
          className="flex min-h-40 w-full flex-col items-center justify-center px-6 text-center disabled:cursor-not-allowed disabled:opacity-60"
        >
          <ImagePlus
            className={`h-9 w-9 ${
              isDragging ? "text-gray-950" : "text-gray-400"
            }`}
          />

          <span className="mt-3 font-semibold text-gray-900">
            {isDragging
              ? "Drop photos here"
              : "Drag & drop product photos here"}
          </span>

          <span className="mt-1 text-sm text-gray-500">
            or click to choose photos from your computer
          </span>

          <span className="mt-2 text-xs text-gray-400">
            JPG, PNG or WebP · maximum 5 MB each
          </span>
        </button>
      </div>

      {files.length > 0 && (
        <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-gray-900">
                {files.length} photo
                {files.length === 1 ? "" : "s"} ready
              </p>

              <p className="mt-1 text-xs text-gray-500">
                You can add more photos before uploading. Upload runs
                automatically in batches of {BATCH_SIZE}.
              </p>
            </div>

            <button
              type="button"
              disabled={isPending}
              onClick={uploadFiles}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gray-950 px-5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading {uploadedCount}/{files.length}
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Upload {files.length} Photos
                </>
              )}
            </button>
          </div>

          {isPending && (
            <div className="mt-4">
              <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full bg-gray-950 transition-all duration-300"
                  style={{
                    width: `${progress}%`,
                  }}
                />
              </div>

              <p className="mt-2 text-xs text-gray-500">
                {uploadedCount} of {files.length} uploaded
              </p>
            </div>
          )}
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          role="status"
          className="mt-4 flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
        >
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          {success}
        </div>
      )}
    </div>
  );
}
