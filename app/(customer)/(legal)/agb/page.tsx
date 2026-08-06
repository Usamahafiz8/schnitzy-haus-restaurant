import type { Metadata } from "next";

export const metadata: Metadata = { title: "AGB" };
export const revalidate = 3600;

export default function AgbPage() {
  return (
    <>
      <h1>Allgemeine Geschäftsbedingungen</h1>

      <h2>1. Geltungsbereich</h2>
      <p>
        Diese Bedingungen gelten für alle Bestellungen, die über diese Website
        bei Schnitzy Haus aufgegeben werden, sowie für Tischreservierungen.
      </p>

      <h2>2. Vertragsschluss</h2>
      <p>
        Die Darstellung der Speisen stellt kein bindendes Angebot dar. Mit dem
        Absenden der Bestellung geben Sie ein verbindliches Angebot ab. Der
        Vertrag kommt mit unserer Bestätigung — spätestens mit der Zubereitung —
        zustande.
      </p>

      <h2>3. Preise und Zahlung</h2>
      <p>
        Alle Preise verstehen sich in Euro einschließlich der gesetzlichen
        Mehrwertsteuer. Zahlbar per Karte über unseren Zahlungsdienstleister
        oder bar bei Abholung bzw. Lieferung.
      </p>

      <h2>4. Lieferung und Abholung</h2>
      <p>
        Angegebene Zeiten sind Schätzungen und keine Fixtermine. Lieferungen
        erfolgen nur innerhalb unseres Liefergebiets; der Mindestbestellwert
        wird im Warenkorb angezeigt.
      </p>

      <h2>5. Stornierung</h2>
      <p>
        Bestellungen können storniert werden, solange die Zubereitung noch nicht
        begonnen hat. Danach wenden Sie sich bitte telefonisch an uns.
        Tischreservierungen können bis zwei Stunden vor der reservierten Zeit
        online storniert werden.
      </p>

      <h2>6. Gutscheine und Bonusprogramm</h2>
      <p>
        Gutscheincodes sind nicht mit Bargeld auszahlbar und können in ihrer
        Nutzung je Person begrenzt sein. Bonuspunkte verfallen{" "}
        <span className="legal-todo">Frist ergänzen</span> und sind nicht
        übertragbar.
      </p>

      <h2>7. Gewährleistung und Haftung</h2>
      <p>
        <span className="legal-todo">
          Haftungsregelungen anwaltlich prüfen und ergänzen.
        </span>
      </p>

      <h2>8. Allergene</h2>
      <p>
        Angaben zu Allergenen finden Sie bei jedem Gericht. Trotz sorgfältiger
        Zubereitung können Spuren anderer Allergene nicht vollständig
        ausgeschlossen werden. Bitte sprechen Sie uns bei Allergien direkt an.
      </p>

      <h2>9. Schlussbestimmungen</h2>
      <p>
        Es gilt deutsches Recht. Sollten einzelne Bestimmungen unwirksam sein,
        bleibt die Wirksamkeit der übrigen unberührt.
      </p>

      <p>
        Stand: <span className="legal-todo">Datum</span>
      </p>
    </>
  );
}
