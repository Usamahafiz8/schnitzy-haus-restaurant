import type { Metadata } from "next";

import { getRestaurant } from "@/lib/restaurant";
import { formatCurrency, toNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "Lieferung & Zahlung" };
export const revalidate = 3600;

/** Reads the live delivery settings so this page can't drift from checkout. */
export default async function LieferungZahlungPage() {
  const restaurant = await getRestaurant();

  const fee = toNumber(restaurant?.deliveryFee ?? 0);
  const minOrder = toNumber(restaurant?.minOrderAmount ?? 0);
  const freeOver =
    restaurant?.freeDeliveryOver == null
      ? null
      : toNumber(restaurant.freeDeliveryOver);

  return (
    <>
      <h1>Lieferung &amp; Zahlung</h1>

      <h2>Liefergebiet</h2>
      <p>
        Wir liefern im Umkreis von etwa {restaurant?.deliveryRadiusKm ?? 8} km um
        unseren Standort in {restaurant?.city ?? "Frankfurt am Main"}. Ob Ihre
        Adresse im Liefergebiet liegt, prüfen wir automatisch an der Kasse.
      </p>

      <h2>Liefergebühr und Mindestbestellwert</h2>
      <ul>
        <li>Liefergebühr: {formatCurrency(fee, "de")}</li>
        <li>Mindestbestellwert: {formatCurrency(minOrder, "de")}</li>
        {freeOver !== null && freeOver > 0 && (
          <li>Ab {formatCurrency(freeOver, "de")} liefern wir kostenfrei.</li>
        )}
      </ul>

      <h2>Lieferzeit</h2>
      <p>
        Die im Bestellvorgang angezeigte Zeit ist eine Schätzung auf Basis der
        Zubereitungsdauer und der aktuellen Auslastung. Den Status Ihrer
        Bestellung können Sie jederzeit live verfolgen.
      </p>

      <h2>Abholung</h2>
      <p>
        Abholbestellungen sind ohne Mindestbestellwert möglich. Sie erhalten eine
        Benachrichtigung, sobald Ihre Bestellung abholbereit ist.
      </p>

      <h2>Zahlungsarten</h2>
      <ul>
        <li>Kredit- und Debitkarte sowie digitale Wallets über Stripe</li>
        <li>Barzahlung bei Abholung oder Lieferung</li>
        <li>
          <span className="legal-todo">
            Weitere Zahlungsarten ergänzen, z. B. PayPal oder Sofortüberweisung
          </span>
        </li>
      </ul>

      <h2>Preise</h2>
      <p>
        Alle Preise verstehen sich einschließlich der gesetzlichen
        Mehrwertsteuer. Der ausgewiesene Steuerbetrag ist im Preis enthalten und
        wird auf der Rechnung separat ausgewiesen.
      </p>

      <h2>Lieferung durch Partner</h2>
      <p>
        Bestellungen über Lieferando, Uber Eats oder Wolt unterliegen zusätzlich
        den Bedingungen des jeweiligen Anbieters.
      </p>
    </>
  );
}
