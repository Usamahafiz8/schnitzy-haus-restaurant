"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { LifeBuoy, Mail, MessageCircle, Send } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/input";
import { EmptyState, Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/misc";
import { apiErrorMessage, postJson, putJson } from "@/lib/api-client";
import { formatDateTime } from "@/lib/utils";

type Inquiry = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  response: string | null;
  status: "OPEN" | "ANSWERED" | "CLOSED";
  createdAt: string;
  respondedAt: string | null;
};

export function SupportInbox({
  inquiries,
  locale,
  whatsappConfigured,
}: {
  inquiries: Inquiry[];
  locale: string;
  whatsappConfigured: boolean;
}) {
  const t = useTranslations("admin");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [tab, setTab] = useState<"OPEN" | "ANSWERED" | "CLOSED" | "ALL">("OPEN");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [pending, setPending] = useState<string | null>(null);

  const filtered = useMemo(
    () => (tab === "ALL" ? inquiries : inquiries.filter((i) => i.status === tab)),
    [inquiries, tab],
  );

  const respond = async (id: string, channel: "EMAIL" | "WHATSAPP") => {
    if (!reply.trim()) return;
    setPending(id);
    try {
      await postJson(`/inquiries/${id}`, { response: reply, channel });
      toast.success(channel === "EMAIL" ? "Email sent" : "WhatsApp sent");
      setReplyTo(null);
      setReply("");
      router.refresh();
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setPending(null);
    }
  };

  const close = async (id: string) => {
    setPending(id);
    try {
      await putJson(`/inquiries/${id}?status=CLOSED`);
      router.refresh();
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setPending(null);
    }
  };

  return (
    <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
      <TabsList>
        <TabsTrigger value="OPEN">
          Open ({inquiries.filter((i) => i.status === "OPEN").length})
        </TabsTrigger>
        <TabsTrigger value="ANSWERED">Answered</TabsTrigger>
        <TabsTrigger value="CLOSED">Closed</TabsTrigger>
        <TabsTrigger value="ALL">{tCommon("all")}</TabsTrigger>
      </TabsList>

      <TabsContent value={tab}>
        {filtered.length === 0 ? (
          <EmptyState icon={LifeBuoy} title={t("noData")} />
        ) : (
          <ul className="space-y-3">
            {filtered.map((inquiry) => (
              <li key={inquiry.id}>
                <Card>
                  <CardContent className="space-y-3 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium">{inquiry.subject}</p>
                        <p className="text-xs text-muted-foreground">
                          {inquiry.name} · {inquiry.email}
                          {inquiry.phone && ` · ${inquiry.phone}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDateTime(inquiry.createdAt, locale)}
                        </p>
                      </div>

                      <Badge
                        variant={
                          inquiry.status === "OPEN"
                            ? "warning"
                            : inquiry.status === "ANSWERED"
                              ? "success"
                              : "neutral"
                        }
                      >
                        {inquiry.status}
                      </Badge>
                    </div>

                    <p className="whitespace-pre-wrap rounded-lg bg-muted px-3 py-2 text-sm">
                      {inquiry.message}
                    </p>

                    {inquiry.response && (
                      <div className="rounded-lg border-l-2 border-primary bg-muted/60 px-3 py-2">
                        <p className="text-xs font-medium">
                          Replied{" "}
                          {inquiry.respondedAt &&
                            formatDateTime(inquiry.respondedAt, locale)}
                        </p>
                        <p className="mt-0.5 whitespace-pre-wrap text-sm text-muted-foreground">
                          {inquiry.response}
                        </p>
                      </div>
                    )}

                    {replyTo === inquiry.id ? (
                      <div className="space-y-2">
                        <Textarea
                          rows={4}
                          value={reply}
                          onChange={(e) => setReply(e.target.value)}
                          placeholder={t("responsePlaceholder")}
                          maxLength={2000}
                          autoFocus
                        />
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            loading={pending === inquiry.id}
                            onClick={() => respond(inquiry.id, "EMAIL")}
                          >
                            <Mail aria-hidden />
                            Reply by email
                          </Button>

                          {whatsappConfigured && inquiry.phone && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={pending === inquiry.id}
                              onClick={() => respond(inquiry.id, "WHATSAPP")}
                            >
                              <MessageCircle aria-hidden />
                              WhatsApp
                            </Button>
                          )}

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
                        <Button
                          size="sm"
                          onClick={() => {
                            setReplyTo(inquiry.id);
                            setReply(inquiry.response ?? "");
                          }}
                        >
                          <Send aria-hidden />
                          {t("respond")}
                        </Button>

                        {inquiry.status !== "CLOSED" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={pending === inquiry.id}
                            onClick={() => close(inquiry.id)}
                          >
                            {tCommon("close")}
                          </Button>
                        )}
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
