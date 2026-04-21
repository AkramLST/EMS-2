"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { XMarkIcon, TrashIcon } from "@heroicons/react/24/outline";

interface ProfileImageEditorProps {
  open: boolean;
  onClose: () => void;
  imageUrl: string | null;
  originalImageUrl?: string | null;
  originalImageFile?: File | null;
  onSave: (croppedImage: Blob, originalFile: File) => Promise<void>;
  onDelete?: () => void;
  employeeName: string;
  onCancelEdit?: () => void;
}

const CONTAINER_WIDTH = 350;
const CONTAINER_HEIGHT = 450;
const getDefaultCropBox = () => ({ x: 50, y: 100, width: 250, height: 250 });

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function calculateCropSource(
  cropBox: { x: number; y: number; width: number; height: number },
  imageWidth: number,
  imageHeight: number,
  effectiveScale: number
) {
  if (effectiveScale <= 0) {
    return { x: 0, y: 0, width: imageWidth, height: imageHeight };
  }

  const containerCenterX = CONTAINER_WIDTH / 2;
  const containerCenterY = CONTAINER_HEIGHT / 2;

  const sourceWidth = cropBox.width / effectiveScale;
  const sourceHeight = cropBox.height / effectiveScale;

  const rawX = imageWidth / 2 + (cropBox.x - containerCenterX) / effectiveScale;
  const rawY = imageHeight / 2 + (cropBox.y - containerCenterY) / effectiveScale;

  const clampedWidth = Math.min(sourceWidth, imageWidth);
  const clampedHeight = Math.min(sourceHeight, imageHeight);

  const x = clamp(rawX, 0, imageWidth - clampedWidth);
  const y = clamp(rawY, 0, imageHeight - clampedHeight);

  return { x, y, width: clampedWidth, height: clampedHeight };
}

export async function compressImageFile(
  file: File,
  options: { maxWidth?: number; maxHeight?: number; quality?: number } = {}
): Promise<File> {
  if (typeof window === "undefined") {
    return file;
  }

  const { maxWidth = 1920, maxHeight = 1920, quality = 0.92 } = options;

  const imageUrl = URL.createObjectURL(file);
  try {
    const img = document.createElement("img");
    const loadImage = () =>
      new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = (err) => reject(err);
        img.src = imageUrl;
      });

    await loadImage();

    const scale = Math.min(1, maxWidth / img.naturalWidth, maxHeight / img.naturalHeight);
    const targetWidth = Math.max(1, Math.round(img.naturalWidth * scale));
    const targetHeight = Math.max(1, Math.round(img.naturalHeight * scale));

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return file;
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality)
    );

    if (!blob) {
      return file;
    }

    const baseName = file.name.replace(/\.[^.]+$/, "");
    return new File([blob], `${baseName}.jpg`, { type: "image/jpeg" });
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

type ResizeHandle = 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w' | null;

interface PreviewCanvasProps {
  imageUrl: string;
  cropSource: { x: number; y: number; width: number; height: number };
  previewSize: number;
}

function PreviewCanvas({ imageUrl, cropSource, previewSize }: PreviewCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      // Clear canvas
      ctx.clearRect(0, 0, previewSize, previewSize);
      
      const { x: sourceX, y: sourceY, width: sourceWidth, height: sourceHeight } = cropSource;

      // Calculate preview dimensions maintaining aspect ratio
      const aspectRatio = sourceWidth / sourceHeight;
      let drawWidth = previewSize;
      let drawHeight = previewSize;
      
      if (aspectRatio > 1) {
        // Wider than tall
        drawHeight = previewSize / aspectRatio;
      } else {
        // Taller than wide
        drawWidth = previewSize * aspectRatio;
      }
      
      // Center the preview
      const offsetX = (previewSize - drawWidth) / 2;
      const offsetY = (previewSize - drawHeight) / 2;
      
      // Draw the cropped portion
      ctx.drawImage(
        img,
        sourceX, sourceY, sourceWidth, sourceHeight,
        offsetX, offsetY, drawWidth, drawHeight
      );
    };
    
    img.src = imageUrl;
  }, [imageUrl, cropSource, previewSize]);

  return (
    <canvas
      ref={canvasRef}
      width={previewSize}
      height={previewSize}
      className="w-full h-full"
    />
  );
}

export default function ProfileImageEditor({
  open,
  onClose,
  imageUrl,
  originalImageUrl,
  originalImageFile,
  onSave,
  onDelete,
  employeeName,
  onCancelEdit,
}: ProfileImageEditorProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [cropBox, setCropBox] = useState(() => getDefaultCropBox());
  const [zoomPercent, setZoomPercent] = useState(0);
  const [baseScale, setBaseScale] = useState(1);
  const [imageDimensions, setImageDimensions] = useState({ width: 1, height: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState<ResizeHandle>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const baseImageRef = useRef<string | null>(null);
  const externalOriginalFileRef = useRef<File | null>(null);

  const getOriginalFile = useCallback(async (): Promise<File> => {
    if (selectedFile) {
      return selectedFile;
    }

    if (externalOriginalFileRef.current) {
      return externalOriginalFileRef.current;
    }

    const sourceUrl = baseImageRef.current ?? originalImageUrl ?? imageUrl;
    if (!sourceUrl) {
      throw new Error("Original image not available");
    }

    const response = await fetch(sourceUrl, { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Failed to fetch original image");
    }

    const blob = await response.blob();
    const mimeType = blob.type || "image/jpeg";
    const fetchedFile = new File([blob], `original.${mimeType.split("/")[1] || "jpg"}`, { type: mimeType });
    return await compressImageFile(fetchedFile, { maxWidth: 1600, maxHeight: 1600, quality: 0.9 });
  }, [selectedFile, originalImageUrl, imageUrl]);

  // Update preview URL when imageUrl prop changes or modal opens
  useEffect(() => {
    if (!open) {
      return;
    }

    if (originalImageFile) {
      externalOriginalFileRef.current = originalImageFile;
    } else if (!originalImageUrl && !imageUrl) {
      externalOriginalFileRef.current = null;
    }

    // Determine base image precedence: explicitly provided original -> cached -> latest imageUrl
    if (originalImageUrl) {
      baseImageRef.current = originalImageUrl;
    } else if (imageUrl && !selectedFile) {
      baseImageRef.current = imageUrl;
    }

    if (!originalImageUrl && !imageUrl && !selectedFile) {
      baseImageRef.current = null;
      setPreviewUrl(null);
      setCropBox(getDefaultCropBox());
      setZoomPercent(0);
      return;
    }

    if (!selectedFile) {
      const baseImage = baseImageRef.current ?? imageUrl;
      if (baseImage) {
        setPreviewUrl(baseImage);
        setCropBox(getDefaultCropBox());
        setZoomPercent(0);
      }
    }
  }, [open, imageUrl, originalImageUrl, originalImageFile, selectedFile]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      try {
        const compressed = await compressImageFile(file, { maxWidth: 1600, maxHeight: 1600, quality: 0.9 });
        const url = URL.createObjectURL(compressed);
        externalOriginalFileRef.current = compressed;
        setSelectedFile(compressed);
        setPreviewUrl(url);
        setCropBox(getDefaultCropBox());
        setZoomPercent(0);
      } catch (error) {
        console.error("Failed to process selected image:", error);
      }
    }
  };

  useEffect(() => {
    if (!previewUrl) {
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
      const coverScale = Math.max(
        CONTAINER_WIDTH / img.naturalWidth,
        CONTAINER_HEIGHT / img.naturalHeight
      );
      setBaseScale(coverScale);
    };
    img.src = previewUrl;
  }, [previewUrl]);

  const zoomFactor = Math.max(0.2, 1 + zoomPercent / 100);
  const effectiveScale = useMemo(() => baseScale * zoomFactor, [baseScale, zoomFactor]);

  const clampBoxToImage = useCallback(
    (box: { x: number; y: number; width: number; height: number }) => {
      if (!imageDimensions.width || !imageDimensions.height || effectiveScale <= 0) {
        return box;
      }

      const scaledWidth = imageDimensions.width * effectiveScale;
      const scaledHeight = imageDimensions.height * effectiveScale;
      const offsetX = (CONTAINER_WIDTH - scaledWidth) / 2;
      const offsetY = (CONTAINER_HEIGHT - scaledHeight) / 2;

      const imageLeft = Math.max(0, offsetX);
      const imageTop = Math.max(0, offsetY);
      const imageRight = Math.min(CONTAINER_WIDTH, offsetX + scaledWidth);
      const imageBottom = Math.min(CONTAINER_HEIGHT, offsetY + scaledHeight);

      const maxWidth = Math.max(1, imageRight - imageLeft);
      const maxHeight = Math.max(1, imageBottom - imageTop);

      let adjustedWidth = Math.min(box.width, maxWidth);
      let adjustedHeight = Math.min(box.height, maxHeight);

      const minWidth = Math.min(100, maxWidth);
      const minHeight = Math.min(100, maxHeight);

      adjustedWidth = Math.max(adjustedWidth, minWidth);
      adjustedHeight = Math.max(adjustedHeight, minHeight);

      const clampedX = clamp(box.x, imageLeft, imageRight - adjustedWidth);
      const clampedY = clamp(box.y, imageTop, imageBottom - adjustedHeight);

      return {
        x: clampedX,
        y: clampedY,
        width: adjustedWidth,
        height: adjustedHeight,
      };
    },
    [imageDimensions, effectiveScale]
  );

  const cropSource = useMemo(() => {
    return calculateCropSource(cropBox, imageDimensions.width, imageDimensions.height, effectiveScale);
  }, [cropBox, imageDimensions, effectiveScale]);

  const resetEditorState = useCallback(() => {
    const sourceFromProps = originalImageUrl ?? imageUrl ?? null;

    if (selectedFile && previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }

    // Always restore baseImageRef to the source from props
    if (sourceFromProps) {
      baseImageRef.current = sourceFromProps;
    }

    const baseImage = sourceFromProps ?? baseImageRef.current ?? null;

    setSelectedFile(null);
    setPreviewUrl(baseImage);
    setCropBox(getDefaultCropBox());
    setZoomPercent(0);
    setIsDragging(false);
    setIsResizing(null);
    setDragStart({ x: 0, y: 0 });
    setBaseScale(1);
    setImageDimensions({ width: 1, height: 1 });
    externalOriginalFileRef.current = originalImageFile ?? null;

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [selectedFile, previewUrl, originalImageUrl, imageUrl, originalImageFile]);

  const handleCancel = useCallback(() => {
    // Only reset if user selected a new file - otherwise just close
    if (selectedFile) {
      resetEditorState();
    }
    onCancelEdit?.();
    onClose();
  }, [selectedFile, resetEditorState, onCancelEdit, onClose]);

  const handleDelete = useCallback(() => {
    if (!onDelete) return;
    setShowDeleteConfirm(true);
  }, [onDelete]);

  const handleConfirmDelete = useCallback(async () => {
    if (!onDelete) return;
    try {
      setDeleting(true);
      await onDelete();
      setShowDeleteConfirm(false);
      handleCancel();
    } catch (error) {
      console.error("Failed to delete profile image:", error);
    } finally {
      setDeleting(false);
    }
  }, [onDelete, handleCancel]);

  const handleDismissDelete = useCallback(() => {
    if (deleting) return;
    setShowDeleteConfirm(false);
  }, [deleting]);

  const handleMouseDown = (e: React.MouseEvent, handle?: ResizeHandle) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (handle) {
      setIsResizing(handle);
    } else {
      setIsDragging(true);
    }
    
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging && !isResizing) return;

      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;

      if (isDragging) {
        setCropBox(prev => ({
          ...clampBoxToImage({
            ...prev,
            x: prev.x + deltaX,
            y: prev.y + deltaY,
          }),
        }));
      } else if (isResizing) {
        setCropBox(prev => {
          let newBox = { ...prev };
          
          switch (isResizing) {
            case 'se': // Bottom-right
              const seSize = Math.max(100, Math.min(350 - prev.x, 450 - prev.y, Math.max(prev.width + deltaX, prev.height + deltaY)));
              newBox.width = seSize;
              newBox.height = seSize;
              break;
            case 'sw': // Bottom-left
              const swSize = Math.max(100, Math.min(prev.x + prev.width, 450 - prev.y, Math.max(prev.width - deltaX, prev.height + deltaY)));
              if (prev.x + prev.width - swSize >= 0) {
                newBox.x = prev.x + prev.width - swSize;
                newBox.width = swSize;
                newBox.height = swSize;
              }
              break;
            case 'ne': // Top-right
              const neSize = Math.max(100, Math.min(350 - prev.x, prev.y + prev.height, Math.max(prev.width + deltaX, prev.height - deltaY)));
              if (prev.y + prev.height - neSize >= 0) {
                newBox.y = prev.y + prev.height - neSize;
                newBox.width = neSize;
                newBox.height = neSize;
              }
              break;
            case 'nw': // Top-left
              const nwSize = Math.max(100, Math.min(prev.x + prev.width, prev.y + prev.height, Math.max(prev.width - deltaX, prev.height - deltaY)));
              if (prev.x + prev.width - nwSize >= 0 && prev.y + prev.height - nwSize >= 0) {
                newBox.x = prev.x + prev.width - nwSize;
                newBox.y = prev.y + prev.height - nwSize;
                newBox.width = nwSize;
                newBox.height = nwSize;
              }
              break;
            case 'e': // Right edge - maintain square
              const eSize = Math.max(100, Math.min(350 - prev.x, prev.width + deltaX));
              newBox.width = eSize;
              newBox.height = eSize;
              break;
            case 'w': // Left edge - maintain square
              const wSize = Math.max(100, prev.width - deltaX);
              if (prev.x + deltaX >= 0) {
                newBox.x = prev.x + deltaX;
                newBox.width = wSize;
                newBox.height = wSize;
              }
              break;
            case 's': // Bottom edge - maintain square
              const sSize = Math.max(100, Math.min(450 - prev.y, prev.height + deltaY));
              newBox.width = sSize;
              newBox.height = sSize;
              break;
            case 'n': // Top edge - maintain square
              const nSize = Math.max(100, prev.height - deltaY);
              if (prev.y + deltaY >= 0) {
                newBox.y = prev.y + deltaY;
                newBox.width = nSize;
                newBox.height = nSize;
              }
              break;
          }
          
          return clampBoxToImage(newBox);
        });
      }

      setDragStart({ x: e.clientX, y: e.clientY });
    },
    [isDragging, isResizing, dragStart, clampBoxToImage]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(null);
  }, []);

  useEffect(() => {
    if (isDragging || isResizing) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);

      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }

    return undefined;
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

  useEffect(() => {
    setCropBox((prev) => {
      const clamped = clampBoxToImage(prev);
      if (
        clamped.x === prev.x &&
        clamped.y === prev.y &&
        clamped.width === prev.width &&
        clamped.height === prev.height
      ) {
        return prev;
      }
      return clamped;
    });
  }, [clampBoxToImage]);

  const handleSave = async () => {
    if (!previewUrl) return;

    setSaving(true);
    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Load the image first
      const img = new window.Image();
      img.crossOrigin = "anonymous";
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = previewUrl;
      });

      // Calculate scale factor from displayed image to natural size
      const { x: sourceX, y: sourceY, width: sourceWidth, height: sourceHeight } = calculateCropSource(
        cropBox,
        img.naturalWidth,
        img.naturalHeight,
        effectiveScale
      );

      // Determine output size: never upscale beyond the cropped source, cap at 600, keep a reasonable minimum
      const availableSize = Math.min(sourceWidth, sourceHeight);
      const outputSize = Math.max(300, Math.min(600, Math.floor(availableSize)));
      canvas.width = outputSize;
      canvas.height = outputSize;

      // Enable image smoothing for better quality
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Fill background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, outputSize, outputSize);

      // Draw cropped image with high quality (downscaling only)
      ctx.drawImage(
        img,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        0,
        0,
        outputSize,
        outputSize
      );

      let originalFile: File | null = null;
      try {
        originalFile = await getOriginalFile();
      } catch (error) {
        console.error("Failed to retrieve original image file:", error);
      }

      canvas.toBlob(async (blob) => {
        if (blob) {
          const fileForUpload = originalFile ?? new File([blob], "profile-original.jpg", { type: blob.type || "image/jpeg" });
          await onSave(blob, fileForUpload);
          setSelectedFile(null);
          onClose();
        }
      }, "image/jpeg", 0.92);
    } catch (error) {
      console.error("Error saving image:", error);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const handleStyle = "absolute w-3 h-3 bg-blue-500 border border-white rounded-sm cursor-pointer hover:scale-125 transition-transform";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-blue-700">Edit Photo</h2>
          <button
            onClick={handleCancel}
            className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
          >
            <XMarkIcon className="h-6 w-6 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8">
          <div className="flex gap-12 items-start">
            {/* Editor Section */}
            <div className="flex-1">
              <div
                ref={containerRef}
                className="relative w-[350px] h-[450px] mx-auto bg-gray-50 rounded-lg overflow-hidden"
                style={{ userSelect: 'none' }}
              >
                {previewUrl && (
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="absolute pointer-events-none"
                    style={{
                      top: '50%',
                      left: '50%',
                      width: imageDimensions.width,
                      height: imageDimensions.height,
                      transform: `translate(-50%, -50%) scale(${effectiveScale})`,
                      transformOrigin: 'center center',
                      maxWidth: 'none',
                      maxHeight: 'none',
                    }}
                    draggable={false}
                  />
                )}
                
                {/* Crop Box */}
                {previewUrl && (
                  <div
                    className="absolute border-2 border-gray-400 cursor-move"
                    style={{
                      left: cropBox.x,
                      top: cropBox.y,
                      width: cropBox.width,
                      height: cropBox.height,
                    }}
                    onMouseDown={(e) => handleMouseDown(e)}
                  >
                    {/* Resize Handles */}
                    {/* Corners */}
                    <div className={handleStyle} style={{ top: -6, left: -6 }} onMouseDown={(e) => handleMouseDown(e, 'nw')} />
                    <div className={handleStyle} style={{ top: -6, right: -6 }} onMouseDown={(e) => handleMouseDown(e, 'ne')} />
                    <div className={handleStyle} style={{ bottom: -6, left: -6 }} onMouseDown={(e) => handleMouseDown(e, 'sw')} />
                    <div className={handleStyle} style={{ bottom: -6, right: -6 }} onMouseDown={(e) => handleMouseDown(e, 'se')} />
                    
                    {/* Edges */}
                    <div className={handleStyle} style={{ top: -6, left: '50%', transform: 'translateX(-50%)' }} onMouseDown={(e) => handleMouseDown(e, 'n')} />
                    <div className={handleStyle} style={{ bottom: -6, left: '50%', transform: 'translateX(-50%)' }} onMouseDown={(e) => handleMouseDown(e, 's')} />
                    <div className={handleStyle} style={{ left: -6, top: '50%', transform: 'translateY(-50%)' }} onMouseDown={(e) => handleMouseDown(e, 'w')} />
                    <div className={handleStyle} style={{ right: -6, top: '50%', transform: 'translateY(-50%)' }} onMouseDown={(e) => handleMouseDown(e, 'e')} />
                  </div>
                )}

                {!previewUrl && (
                  <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                    <p>No image selected</p>
                  </div>
                )}
              </div>

              {/* Controls */}
              <div className="mt-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Zoom: {Math.round(zoomFactor * 100)}%
                  </label>
                  <input
                    type="range"
                    min={-80}
                    max={80}
                    value={zoomPercent}
                    onChange={(e) => setZoomPercent(Number(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div className="flex gap-3 justify-center">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-6 py-2.5 border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-medium"
                  >
                    Change Photo
                  </button>
                  {onDelete && (
                    <button
                    onClick={handleDelete}
                    className="p-2.5 border-2 border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                  )}
                </div>
              </div>
            </div>

            {/* Preview Section */}
            <div className="flex-shrink-0 pt-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Preview</h3>
              {/* All 3 previews in ONE horizontal line - ROUNDED SQUARES */}
              <div className="flex items-center justify-center gap-3">
                {/* Large preview */}
                <div className="w-24 h-24 rounded-lg overflow-hidden bg-gray-100 border-2 border-gray-200 relative">
                  {previewUrl ? (
                    <PreviewCanvas
                      imageUrl={previewUrl}
                      cropSource={cropSource}
                      previewSize={96}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                      Large
                    </div>
                  )}
                </div>

                {/* Medium preview */}
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 border-2 border-gray-200 relative">
                  {previewUrl ? (
                    <PreviewCanvas
                      imageUrl={previewUrl}
                      cropSource={cropSource}
                      previewSize={64}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                      Med
                    </div>
                  )}
                </div>

                {/* Small preview */}
                <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 border-2 border-gray-200 relative">
                  {previewUrl ? (
                    <PreviewCanvas
                      imageUrl={previewUrl}
                      cropSource={cropSource}
                      previewSize={40}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                      Sm
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-8 pb-6">
          <button
            onClick={handleCancel}
            className="px-6 py-2.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!previewUrl || saving}
            className="px-8 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      {showDeleteConfirm && onDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Remove Profile Photo?</h3>
            <p className="text-sm text-gray-600 mb-6">
              This will delete the current profile picture for {employeeName}. You can upload a new photo later if needed.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={handleDismissDelete}
                disabled={deleting}
                className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Keep Photo
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="px-5 py-2.5 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting ? "Deleting..." : "Delete Photo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
