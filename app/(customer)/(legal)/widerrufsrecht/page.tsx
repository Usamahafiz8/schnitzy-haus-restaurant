import type { Metadata } from "next";

import { getRestaurant } from "@/lib/restaurant";

export const metadata: Metadata = { title: "Widerrufsrecht" };
export const revalidate = 3600;

export default async function WiderrufsrechtPage() {
  const restaurant = await getRestaurant();

  return (
    <>
      <h1>Widerrufsrecht</h1>

      <h2>Ausnahme bei Lebensmitteln</h2>
      <p>
        Bei der Lieferung von Speisen und Getränken, die schnell verderben
        können oder deren Verfallsdatum schnell überschritten würde, besteht
        gemäß § 312g Abs. 2 Nr. 2 BGB kein Widerrufsrecht. Gleiches gilt nach
        Nr. 9 für Dienstleistungen im Zusammenhang mit der Lieferung von Speisen
        und Getränken zu einem bestimmten Zeitpunkt — dazu zählen
        Tischreservierungen.
      </p>

      <h2>Widerrufsbelehrung für sonstige Leistungen</h2>
      <p>
        Soweit Sie andere Waren erwerben (etwa Gutscheine oder Merchandise),
        gilt Folgendes:
      </p>
      <p>
        Sie haben das Recht, binnen vierzehn Tagen ohne Angabe von Gründen
        diesen Vertrag zu widerrufen. Die Widerrufsfrist beträgt vierzehn Tage
        ab dem Tag des Vertragsschlusses bzw. ab Erhalt der Ware.
      </p>
      <p>
        Um Ihr Widerrufsrecht auszuüben, müssen Sie uns mittels einer
        eindeutigen Erklärung (z. B. per Post oder E-Mail) über Ihren Entschluss
        informieren:
      </p>
      <address>
        {restaurant?.name ?? "Schnitzy Haus"}
        <br />
        {restaurant?.address ?? "Berger Straße 123"}
        <br />
        {restaurant?.postalCode ?? "60316"} {restaurant?.city ?? "Frankfurt am Main"}
        <br />
        E-Mail: <a href={`mailto:${restaurant?.email ?? "info@schnitzyhaus.de"}`}>{restaurant?.email ?? "info@schnitzyhaus.de"}</a>
      </address>

      <h2>Folgen des Widerrufs</h2>
      <p>
        Wenn Sie diesen Vertrag widerrufen, haben wir Ihnen alle Zahlungen
        unverzüglich und spätestens binnen vierzehn Tagen zurückzuzahlen. Für
        die Rückzahlung verwenden wir dasselbe Zahlungsmittel, das Sie bei der
        ursprünglichen Transaktion eingesetzt haben.
      </p>

      <h2>Muster-Widerrufsformular</h2>
      <p>
        <span className="legal-todo">
          Muster-Widerrufsformular nach Anlage 2 zu Art. 246a EGBGB einfügen,
          sofern widerrufsfähige Leistungen angeboten werden.
        </span>
      </p>
    </>
  );
}
