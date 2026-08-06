import type { Metadata } from "next";

import { getRestaurant } from "@/lib/restaurant";

export const metadata: Metadata = { title: "Datenschutzerklärung" };
export const revalidate = 3600;

/**
 * The processing activities listed here mirror what this application actually
 * does, so the operator's lawyer has an accurate starting point rather than a
 * generic template that under-declares.
 */
export default async function DatenschutzPage() {
  const restaurant = await getRestaurant();

  return (
    <>
      <h1>Datenschutzerklärung</h1>

      <h2>1. Verantwortlicher</h2>
      <address>
        {restaurant?.name ?? "Schnitzy Haus"}
        <br />
        {restaurant?.address ?? "Berger Straße 123"}
        <br />
        {restaurant?.postalCode ?? "60316"} {restaurant?.city ?? "Frankfurt am Main"}
        <br />
        E-Mail: <a href={`mailto:${restaurant?.email ?? "info@schnitzyhaus.de"}`}>{restaurant?.email ?? "info@schnitzyhaus.de"}</a>
      </address>
      <p>
        Datenschutzbeauftragte/r:{" "}
        <span className="legal-todo">Name und Kontakt, falls benannt</span>
      </p>

      <h2>2. Welche Daten wir verarbeiten</h2>
      <ul>
        <li>
          <strong>Kundenkonto:</strong> Vor- und Nachname, E-Mail-Adresse,
          Telefonnummer, Passwort (nur als Hash gespeichert), Spracheinstellung
          und Benachrichtigungseinstellungen.
        </li>
        <li>
          <strong>Bestellungen:</strong> Bestellpositionen, Beträge, Abhol- oder
          Lieferart, Lieferadresse, Anmerkungen sowie der Bestellstatus.
        </li>
        <li>
          <strong>Tischreservierungen:</strong> Name, Telefonnummer, E-Mail,
          Personenzahl, Datum, Uhrzeit und Sonderwünsche.
        </li>
        <li>
          <strong>Bewertungen:</strong> Bewertung, Text und ggf. hochgeladene
          Bilder.
        </li>
        <li>
          <strong>Bonusprogramm:</strong> Punktestand, Stufe und Umsatzsumme.
        </li>
        <li>
          <strong>Technische Daten:</strong> IP-Adresse zur Begrenzung
          missbräuchlicher Anfragen (Rate Limiting) sowie Server-Logs.
        </li>
      </ul>

      <h2>3. Zwecke und Rechtsgrundlagen</h2>
      <ul>
        <li>
          Vertragserfüllung (Art. 6 Abs. 1 lit. b DSGVO): Bestellabwicklung,
          Reservierungen, Kundenkonto, Zahlungsabwicklung.
        </li>
        <li>
          Berechtigtes Interesse (Art. 6 Abs. 1 lit. f DSGVO): Betrugsprävention,
          IT-Sicherheit, Verbesserung unseres Angebots.
        </li>
        <li>
          Einwilligung (Art. 6 Abs. 1 lit. a DSGVO): Push-Benachrichtigungen,
          WhatsApp-Nachrichten und Werbe-E-Mails. Widerruf jederzeit möglich.
        </li>
        <li>
          Rechtliche Verpflichtung (Art. 6 Abs. 1 lit. c DSGVO): handels- und
          steuerrechtliche Aufbewahrungspflichten.
        </li>
      </ul>

      <h2>4. Empfänger und Auftragsverarbeiter</h2>
      <p>
        Wir setzen die folgenden Dienstleister ein. Die konkret genutzten
        Anbieter sind vor dem Livegang zu prüfen und um die jeweils
        abgeschlossenen Auftragsverarbeitungsverträge zu ergänzen.
      </p>
      <ul>
        <li>Stripe — Zahlungsabwicklung</li>
        <li>Google Maps — Kartendarstellung und Adresssuche</li>
        <li>Firebase Cloud Messaging — Push-Benachrichtigungen</li>
        <li>Twilio — WhatsApp-Benachrichtigungen</li>
        <li>
          <span className="legal-todo">
            E-Mail-Versanddienst, Hosting-Anbieter, Objektspeicher
          </span>
        </li>
      </ul>

      <h2>5. Drittlandtransfer</h2>
      <p>
        <span className="legal-todo">
          Sofern Anbieter außerhalb der EU/des EWR verarbeiten, hier die
          Garantien nach Art. 44 ff. DSGVO benennen.
        </span>
      </p>

      <h2>6. Speicherdauer</h2>
      <p>
        Bestell- und Rechnungsdaten bewahren wir entsprechend der gesetzlichen
        Aufbewahrungsfristen auf (in der Regel zehn Jahre). Kontodaten löschen
        wir nach Schließung des Kontos, sofern keine Aufbewahrungspflicht
        entgegensteht.
      </p>

      <h2>7. Ihre Rechte</h2>
      <p>
        Sie haben das Recht auf Auskunft (Art. 15), Berichtigung (Art. 16),
        Löschung (Art. 17), Einschränkung der Verarbeitung (Art. 18),
        Datenübertragbarkeit (Art. 20) sowie Widerspruch (Art. 21 DSGVO).
        Erteilte Einwilligungen können Sie jederzeit mit Wirkung für die Zukunft
        widerrufen.
      </p>
      <p>
        Zudem steht Ihnen ein Beschwerderecht bei einer Aufsichtsbehörde zu, in
        Hessen beim Hessischen Beauftragten für Datenschutz und
        Informationsfreiheit.
      </p>

      <h2>8. Cookies und lokale Speicherung</h2>
      <p>
        Wir verwenden technisch notwendige Cookies für die Anmeldung sowie für
        die Speicherung Ihrer Sprachwahl. Ihr Warenkorb wird ausschließlich
        lokal in Ihrem Browser gespeichert und nicht an uns übertragen, solange
        Sie keine Bestellung abschließen.
      </p>

      <p>
        Stand: <span className="legal-todo">Datum der letzten Aktualisierung</span>
      </p>
    </>
  );
}
