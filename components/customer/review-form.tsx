"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { CheckCircle2, ImagePlus, X } from "lucide-react";
import { toast } from "sonner";

import { StarInput } from "@/components/shared/star-rating";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/form-field";
import { Input, Textarea } from "@/components/ui/input";
import { api, apiErrorMessage, postJson } from "@/lib/api-client";

const MAX_IMAGES = 5;

export function ReviewForm({ orderId }: { orderId?: string }) {
  const t = useTranslations("reviews");
  const router = useRouter();

  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const upload = async (files: FileList) => {
    const room = MAX_IMAGES - images.length;
    if (room <= 0) return;

    setUploading(true);
    try {
      const uploaded: string[] = [];

      for (const file of Array.from(files).slice(0, room)) {
        const form = new FormData();
        form.append("file", file);
        form.append("folder", "reviews");

        const response = await api.post<{ data: { url: string } }>("/upload", form, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        uploaded.push(response.data.data.url);
      }

      setImages((prev) => [...prev, ...uploaded]);
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    if (rating === 0) {
      toast.error(t("yourRating"));
      return;
    }

    setSubmitting(true);
    try {
      await postJson("/reviews", {
        orderId,
        rating,
        title: title || undefined,
        comment: comment || undefined,
        images,
      });
      setDone(true);
      router.refresh();
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="flex items-center gap-3 rounded-lg bg-emerald-50 p-4">
        <CheckCircle2 className="size-5 shrink-0 text-emerald-600" aria-hidden />
        <p className="text-sm">{t("submitted")}</p>
      </div>
    );
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <div>
        <p className="mb-2 text-sm font-medium">{t("yourRating")}</p>
        <StarInput value={rating} onChange={setRating} label={t("yourRating")} />
      </div>

      <Field label={t("reviewTitle")} htmlFor="reviewTitle">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("reviewTitlePlaceholder")}
          maxLength={120}
        />
      </Field>

      <Field label={t("comment")} htmlFor="reviewComment">
        <Textarea
          rows={4}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={t("commentPlaceholder")}
          maxLength={2000}
        />
      </Field>

      <div>
        <p className="mb-2 text-sm font-medium">{t("addPhotos")}</p>
        <div className="flex flex-wrap gap-2">
          {images.map((url) => (
            <div key={url} className="relative size-16 overflow-hidden rounded-lg border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="size-full object-cover" />
              <button
                type="button"
                onClick={() => setImages((prev) => prev.filter((u) => u !== url))}
                className="absolute right-0.5 top-0.5 rounded-full bg-background/90 p-0.5"
                aria-label="Remove photo"
              >
                <X className="size-3" />
              </button>
            </div>
          ))}

          {images.length < MAX_IMAGES && (
            <label className="flex size-16 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border text-muted-foreground hover:bg-muted">
              <ImagePlus className="size-4" aria-hidden />
              <span className="sr-only">{t("addPhotos")}</span>
              <input
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                disabled={uploading}
                onChange={(e) => e.target.files && upload(e.target.files)}
              />
            </label>
          )}
        </div>
      </div>

      <Button type="submit" loading={submitting || uploading} disabled={rating === 0}>
        {t("submit")}
      </Button>
    </form>
  );
}
