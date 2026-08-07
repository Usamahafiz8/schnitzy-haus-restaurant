import { AlertTriangle } from "lucide-react";

/**
 * German commercial sites must carry an Impressum (§5 DDG), a GDPR privacy
 * notice, terms, and — for distance selling — withdrawal and delivery/payment
 * information. The structure here is real; the wording that carries legal
 * weight has to come from the operator and ideally their lawyer, so those spots
 * are marked rather than invented.
 */
export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <div className="mb-8 flex gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm">
        <AlertTriangle
          className="mt-0.5 size-5 shrink-0 text-amber-600"
          aria-hidden
        />
        <p className="text-amber-900">
          <strong>Vorlage — vor dem Livegang ersetzen.</strong> Diese Seite ist
          ein Gerüst mit Platzhaltern. Rechtstexte müssen von der Betreiberin
          bzw. dem Betreiber (idealerweise anwaltlich geprüft) eingesetzt werden.
        </p>
      </div>

      <article className="legal-prose">{children}</article>
    </div>
  );
}
