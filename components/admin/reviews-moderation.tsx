"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { Check, Flag, MessageSquare, Reply, X } from "lucide-react";
import { toast } from "sonner";

import { StarRating } from "@/components/shared/star-rating";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/input";
import { EmptyState, Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/misc";
import { apiErrorMessage, postJson, putJson } from "@/lib/api-client";
import { formatDate } from "@/lib/utils";
import type { ReviewStatus } from "@/types";

type Review = {
  id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  status: ReviewStatus;
  adminResponse: string | null;
  reportCount: number;
  createdAt: string;
  customer: { firstName: string; lastName: string; email: string };
  order: { orderNumber: string } | null;
};

export function ReviewsModeration({
  reviews,
  locale,
}: {
  reviews: Review[];
  locale: string;
}) {
  const t = useTranslations("admin");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [tab, setTab] = useState<ReviewStatus | "ALL">("PENDING");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [pending, setPending] = useState<string | null>(null);

  const filtered = useMemo(
    () => (tab === "ALL" ? reviews : reviews.filter((r) => r.status === tab)),
    [reviews, tab],
  );

  const moderate = async (id: string, action: "approve" | "reject") => {
    setPending(id);
    try {
      await postJson(`/reviews/${id}/moderate`, { action });
      toast.success(action === "approve" ? t("approve") : t("reject"));
      router.refresh();
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setPending(null);
    }
  };

  const respond = async (id: string) => {
    if (!reply.trim()) return;
    setPending(id);
    try {
      await putJson(`/reviews/${id}/moderate`, { response: reply });
      toast.success(t("respond"));
      setReplyTo(null);
      setReply("");
      router.refresh();
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setPending(null);
    }
  };

  return (
    <Tabs value={tab} onValueChange={(v) => setTab(v as ReviewStatus | "ALL")}>
      <TabsList>
        <TabsTrigger value="PENDING">
          Pending ({reviews.filter((r) => r.status === "PENDING").length})
        </TabsTrigger>
        <TabsTrigger value="APPROVED">Approved</TabsTrigger>
        <TabsTrigger value="REJECTED">Rejected</TabsTrigger>
        <TabsTrigger value="ALL">{tCommon("all")}</TabsTrigger>
      </TabsList>

      <TabsContent value={tab}>
        {filtered.length === 0 ? (
          <EmptyState icon={MessageSquare} title={t("noData")} />
        ) : (
          <ul className="space-y-3">
            {filtered.map((review) => (
              <li key={review.id}>
                <Card>
                  <CardContent className="space-y-3 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <StarRating value={review.rating} />
                        <p className="mt-1 text-sm font-medium">
                          {review.customer.firstName} {review.customer.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {review.customer.email} · {formatDate(review.createdAt, locale)}
                          {review.order && ` · ${review.order.orderNumber}`}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {review.reportCount > 0 && (
                          <Badge variant="danger">
                            <Flag aria-hidden />
                            {review.reportCount}
                          </Badge>
                        )}
                        <Badge
                          variant={
                            review.status === "APPROVED"
                              ? "success"
                              : review.status === "REJECTED"
                                ? "danger"
                                : "warning"
                          }
                        >
                          {review.status}
                        </Badge>
                      </div>
                    </div>

                    {review.title && <p className="font-medium">{review.title}</p>}
                    {review.comment && (
                      <p className="text-sm text-muted-foreground">{review.comment}</p>
                    )}

                    {review.adminResponse && (
                      <div className="rounded-lg border-l-2 border-primary bg-muted/60 px-3 py-2">
                        <p className="text-xs font-medium">Your reply</p>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                          {review.adminResponse}
                        </p>
                      </div>
                    )}

                    {replyTo === review.id ? (
                      <div className="space-y-2">
                        <Textarea
                          rows={3}
                          value={reply}
                          onChange={(e) => setReply(e.target.value)}
                          placeholder={t("responsePlaceholder")}
                          maxLength={1000}
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            loading={pending === review.id}
                            onClick={() => respond(review.id)}
                          >
                            {t("respond")}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setReplyTo(null);
                              setReply("");
                            }}
                          >
                            {tCommon("cancel")}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {review.status !== "APPROVED" && (
                          <Button
                            size="sm"
                            disabled={pending === review.id}
                            onClick={() => moderate(review.id, "approve")}
                          >
                            <Check aria-hidden />
                            {t("approve")}
                          </Button>
                        )}
                        {review.status !== "REJECTED" && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={pending === review.id}
                            onClick={() => moderate(review.id, "reject")}
                          >
                            <X aria-hidden />
                            {t("reject")}
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setReplyTo(review.id);
                            setReply(review.adminResponse ?? "");
                          }}
                        >
                          <Reply aria-hidden />
                          {t("respond")}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </TabsContent>
    </Tabs>
  );
}
