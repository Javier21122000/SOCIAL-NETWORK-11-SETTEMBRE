import Modal from "./Modal";

export default function SettingsModal({ onClose }) {
  return (
    <Modal title="Impostazioni" onClose={onClose}>
      <div className="divide-y divide-neutral-100">
        <details className="py-4">
          <summary className="cursor-pointer text-sm font-medium">
            Privacy e sicurezza
          </summary>
          <p className="mt-3 text-sm leading-6 text-neutral-500">
            Questo spazio non richiede autenticazione. I post sono pubblici;
            nome e foto del profilo vengono salvati nel browser. La fotocamera
            viene attivata solo su richiesta e spenta alla chiusura.
          </p>
        </details>
        <details className="py-4">
          <summary className="cursor-pointer text-sm font-medium">
            Lavora con noi
          </summary>
          <p className="mt-3 text-sm leading-6 text-neutral-500">
            Al momento non ci sono posizioni aperte pubblicate.
          </p>
        </details>
        <details className="py-4">
          <summary className="cursor-pointer text-sm font-medium">
            Account Professionisti
          </summary>
          <p className="mt-3 text-sm leading-6 text-neutral-500">
            Gli account professionali non sono ancora disponibili in questa
            versione.
          </p>
        </details>
      </div>
    </Modal>
  );
}
