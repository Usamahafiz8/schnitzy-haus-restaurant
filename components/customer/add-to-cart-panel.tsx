"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Heart, Minus, Plus, ShoppingBag } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/form-field";
import { getJson, postJson } from "@/lib/api-client";
import { useCart } from "@/lib/store/cart";
import { cn, formatCurrency } from "@/lib/utils";

type FavoriteRow = { menuItem: { id: string } };

export function AddToCartPanel({
  item,
  locale,
  currency,
}: {
  item: {
    id: string;
    name: string;
    nameDe?: string | null;
    price: number;
    image?: string | null;
    preparationTime: number;
    isAvailable: boolean;
  };
  locale: string;
  currency: string;
}) {
  const t = useTranslations("menu");
  const router = useRouter();
  const { status } = useSession();

  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const [favorited, setFavorited] = useState(false);
  const [favoritePending, setFavoritePending] = useState(false);

  const add = useCart((s) => s.add);

  useEffect(() => {
    if (status !== "authenticated") return;
    void getJson<FavoriteRow[]>("/favorites")
      .then((rows) => setFavorited(rows.some((row) => row.menuItem.id === item.id)))
      .catch(() => undefined);
  }, [status, item.id]);

  const handleAdd = () => {
    add(
      {
        itemId: item.id,
        name: item.name,
        nameDe: item.nameDe,
        price: item.price,
        image: item.image,
        preparationTime: item.preparationTime,
        specialNotes: notes.trim() || undefined,
      },
      quantity,
    );
    toast.success(t("added"), {
      description: `${quantity}× ${locale === "de" && item.nameDe ? item.nameDe : item.name}`,
      action: { label: "Cart", onClick: () => router.push("/cart") },
    });
    setQuantity(1);
    setNotes("");
  };

  const toggleFavorite = async () => {
    if (status !== "authenticated") {
      router.push(`/auth/login?callbackUrl=/menu/${item.id}`);
      return;
    }
    setFavoritePending(true);
    try {
      const result = await postJson<{ favorited: boolean }>("/favorites", {
        menuItemId: item.id,
      });
      setFavorited(result.favorited);
    } catch {
      toast.error("Couldn't update favourites");
    } finally {
      setFavoritePending(false);
    }
  };

  return (
    <div className="space-y-4">
      <Field label={t("specialNotes")} htmlFor="special-notes">
        <Textarea
          id="special-notes"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t("specialNotesPlaceholder")}
          maxLength={300}
        />
      </Field>

      <div className="flex items-center gap-3">
        <div className="flex items-center rounded-lg border border-border">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            disabled={quantity <= 1}
            aria-label="Decrease quantity"
          >
            <Minus />
          </Button>
          <span className="w-10 text-center font-medium tabular-nums" aria-live="polite">
            {quantity}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setQuantity((q) => Math.min(50, q + 1))}
            disabled={quantity >= 50}
            aria-label="Increase quantity"
          >
            <Plus />
          </Button>
        </div>

        <Button
          size="lg"
          className="flex-1"
          onClick={handleAdd}
          disabled={!item.isAvailable}
        >
          <ShoppingBag aria-hidden />
          {item.isAvailable
            ? `${t("addToCart")} · ${formatCurrency(item.price * quantity, locale, currency)}`
            : t("unavailable")}
        </Button>

        <Button
          variant="outline"
          size="icon"
          onClick={toggleFavorite}
          loading={favoritePending}
          aria-label={favorited ? t("unfavourite") : t("favourite")}
          aria-pressed={favorited}
        >
          <Heart className={cn(favorited && "fill-destructive text-destructive")} />
        </Button>
      </div>
    </div>
  );
}
