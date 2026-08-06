import type { Metadata } from "next";

import { getRestaurant } from "@/lib/restaurant";

export const metadata: Metadata = { title: "Impressum" };
export const revalidate = 3600;

/** Angaben gemäß § 5 DDG (vormals § 5 TMG). */
export default async function ImpressumPage() {
  const restaurant = await getRestaurant();

  return (
    <>
      <h1>Impressum</h1>

      <h2>Angaben gemäß § 5 DDG</h2>
      <address>
        {restaurant?.name ?? "Schnitzy Haus"}
        <br />
        <span className="legal-todo">Rechtsform und vollständige Firmierung</span>
        <br />
        {restaurant?.address ?? "Berger Straße 123"}
        <br />
        {restaurant?.postalCode ?? "60316"} {restaurant?.city ?? "Frankfurt am Main"}
        <br />
        Deutschland
      </address>

      <h2>Vertreten durch</h2>
      <p>
        <span className="legal-todo">Name der vertretungsberechtigten Person</span>
      </p>

      <h2>Kontakt</h2>
      <address>
        Telefon: <a href={`tel:${(restaurant?.phone ?? "").replace(/\s/g, "")}`}>{restaurant?.phone ?? "+49 69 12345678"}</a>
        <br />
        E-Mail: <a href={`mailto:${restaurant?.email ?? "info@schnitzyhaus.de"}`}>{restaurant?.email ?? "info@schnitzyhaus.de"}</a>
      </address>

      <h2>Registereintrag</h2>
      <p>
        Registergericht: <span className="legal-todo">Amtsgericht</span>
        <br />
        Registernummer: <span className="legal-todo">HRB …</span>
      </p>

      <h2>Umsatzsteuer-Identifikationsnummer</h2>
      <p>
        Gemäß § 27 a Umsatzsteuergesetz:{" "}
        <span className="legal-todo">DE …</span>
      </p>

      <h2>Aufsichtsbehörde</h2>
      <p>
        <span className="legal-todo">
          Zuständiges Ordnungs-/Gesundheitsamt, falls erlaubnispflichtig
        </span>
      </p>

      <h2>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
      <p>
        <span className="legal-todo">Name und Anschrift</span>
      </p>

      <h2>EU-Streitschlichtung</h2>
      <p>
        Die Europäische Kommission stellt eine Plattform zur
        Online-Streitbeilegung bereit:{" "}
        <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noreferrer noopener">
          ec.europa.eu/consumers/odr
        </a>
        . Unsere E-Mail-Adresse finden Sie oben.
      </p>

      <h2>Verbraucherstreitbeilegung</h2>
      <p>
        Wir sind <span className="legal-todo">nicht bereit / bereit</span>, an
        einem Streitbeilegungsverfahren vor einer
        Verbraucherschlichtungsstelle teilzunehmen.
      </p>
    </>
  );
}
