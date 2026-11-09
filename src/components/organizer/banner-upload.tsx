"use client";

import { useState, useRef } from "react";
import { UploadCloud, ImageIcon, X, Link2, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import Image from "next/image";

interface BannerUploadProps {
  value?: string | null;
  onChange: (url: string) => void;
  disabled?: boolean;
}

const PRESETS = [
  {
    name: "Tech Meetup",
    url: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&q=80&auto=format&fit=crop",
  },
  {
    name: "Hackathon",
    url: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=1200&q=80&auto=format&fit=crop",
  },
  {
    name: "Design Roundtable",
    url: "https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=1200&q=80&auto=format&fit=crop",
  },
  {
    name: "Founder Mixer",
    url: "https://images.unsplash.com/photo-1511578314322-379afb476865?w=1200&q=80&auto=format&fit=crop",
  },
];

export function BannerUpload({ value, onChange, disabled }: BannerUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [customUrl, setCustomUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file (PNG, JPG, WebP, AVIF).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be under 5 MB.");
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || data.message || "Failed to upload image.");
      }

      onChange(data.url);
      toast.success("Banner image uploaded successfully to Cloudinary!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to upload banner.";
      toast.error(msg);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handleApplyCustomUrl(e: React.FormEvent) {
    e.preventDefault();
    if (!customUrl.trim()) return;
    try {
      new URL(customUrl.trim());
      onChange(customUrl.trim());
      setShowUrlInput(false);
      setCustomUrl("");
      toast.success("Banner URL updated.");
    } catch {
      toast.error("Please enter a valid image URL starting with http:// or https://");
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          Event Banner Image
        </label>
        {!value && (
          <button
            type="button"
            onClick={() => setShowUrlInput(!showUrlInput)}
            className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
          >
            <Link2 className="size-3" />
            {showUrlInput ? "Upload file instead" : "Paste URL instead"}
          </button>
        )}
      </div>

      {value ? (
        <div className="group relative overflow-hidden rounded-xl border bg-muted shadow-sm aspect-[21/9]">
          <Image
            src={value}
            alt="Event banner preview"
            fill
            sizes="(max-width: 768px) 100vw, 600px"
            className="object-cover transition-transform duration-300 group-hover:scale-102"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80" />
          
          <div className="absolute top-3 right-3 flex items-center gap-2">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="h-8 gap-1.5 shadow-md"
              onClick={() => onChange("")}
              disabled={disabled}
            >
              <X className="size-3.5" />
              <span>Remove</span>
            </Button>
          </div>

          <div className="absolute bottom-3 left-3 flex items-center gap-2 text-xs font-medium text-white/90">
            <ImageIcon className="size-4" />
            <span>
              {value.includes("cloudinary") ? "Hosted on Cloudinary" : "Custom Banner Image"}
            </span>
          </div>
        </div>
      ) : showUrlInput ? (
        <form onSubmit={handleApplyCustomUrl} className="flex gap-2">
          <Input
            value={customUrl}
            onChange={(e) => setCustomUrl(e.target.value)}
            placeholder="https://images.unsplash.com/photo-..."
            className="text-xs"
            disabled={disabled}
          />
          <Button type="submit" size="sm" disabled={disabled || !customUrl.trim()}>
            Apply
          </Button>
        </form>
      ) : (
        <div className="space-y-3">
          <div
            onClick={() => !disabled && !isUploading && fileInputRef.current?.click()}
            className={`group relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/25 p-6 text-center transition-all hover:border-primary/50 hover:bg-muted/40 cursor-pointer ${
              disabled || isUploading ? "pointer-events-none opacity-60" : ""
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/avif"
              className="hidden"
              onChange={handleFileChange}
              disabled={disabled || isUploading}
            />

            <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary transition-transform group-hover:scale-110">
              {isUploading ? (
                <Loader2 className="size-6 animate-spin" />
              ) : (
                <UploadCloud className="size-6" />
              )}
            </div>

            <p className="text-sm font-semibold">
              {isUploading ? "Uploading to Cloudinary…" : "Click or drag banner image here"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              PNG, JPG, WebP up to 5 MB (Recommended 1200 × 630 px)
            </p>
          </div>

          {/* Quick preset banners for convenience */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Sparkles className="size-3 text-primary" /> Or pick a theme:
            </span>
            {PRESETS.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => onChange(preset.url)}
                className="rounded-md border border-border/60 bg-muted/30 px-2 py-0.5 text-xs text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

