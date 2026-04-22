import { motion } from 'motion/react';
import { ArrowLeft, Shield, Scale } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function LegalPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0B0D0F] text-slate-200 p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors mb-12 group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-xs font-bold uppercase tracking-widest">Zurück</span>
        </button>

        <header className="mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tighter mb-4">Datenschutz</h1>
          <p className="text-slate-500 uppercase tracking-[0.2em] text-[10px]">Deine Daten gehören dir.</p>
        </header>

        <div className="space-y-20 pb-20">
          {/* Datenschutzerklärung */}
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="prose prose-invert max-w-none"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 border border-blue-500/20">
                <Shield size={20} />
              </div>
              <h2 className="text-2xl font-bold text-white m-0">Datenschutzerklärung (DSGVO)</h2>
            </div>
            <div className="bg-[#14171C] border border-white/5 rounded-2xl p-8 space-y-6 text-slate-400 leading-relaxed text-sm">
              <div>
                <h3 className="text-white font-bold mb-2">1. Verantwortliche Stelle</h3>
                <p>
                  Diese Web-App wird als private, nicht-kommerzielle Instanz selbst gehostet. 
                  Verantwortlich für die Datenverarbeitung ist der Betreiber der jeweiligen Instanz.
                </p>
              </div>

              <div>
                <h3 className="text-white font-bold mb-2">2. Datenerfassung & Speicherung</h3>
                <p>
                  Sämtliche Daten werden lokal in einer SQLite-Datenbank auf dem Server des Betreibers gespeichert. 
                  Es erfolgt keine Weitergabe an Dritte oder externe Cloud-Dienste. Erfasst werden:
                </p>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li><strong>Account-Daten:</strong> E-Mail-Adresse und Passwort (kryptografisch gehasht).</li>
                  <li><strong>Fahrzeugdaten:</strong> Modellbezeichnungen, Baujahre und Kilometerstände.</li>
                  <li><strong>Service-Historie:</strong> Durchgeführte Arbeiten, Notizen und hochgeladene Belege (Bilder/PDFs).</li>
                </ul>
              </div>

              <div>
                <h3 className="text-white font-bold mb-2">3. Cookies & Authentifizierung</h3>
                <p>
                  Die App nutzt technisch notwendige Cookies (JWT), um deine Anmeldung zu verwalten und 
                  Sicherheitsfunktionen bereitzustellen. Ohne diese Cookies ist ein Login nicht möglich. 
                  Es findet kein Tracking zu Werbezwecken statt.
                </p>
              </div>

              <div>
                <h3 className="text-white font-bold mb-2">4. Interne Nutzungsanalyse & Verwaltung</h3>
                <p>
                  Zur Überwachung der Systemstabilität und Verwaltung der Plattform (z.B. Support oder Account-Bereinigungen) 
                  können Administratoren dieser Instanz eine Liste der registrierten Benutzer (E-Mail, Anzeigename, Registrierungsdatum) einsehen. 
                  Inhalte deiner Fahrzeuge und Services sind privat und werden für statistische Auswertungen ausschließlich 
                  <strong>aggregiert und anonymisiert</strong> erfasst. Dabei werden keine Rückschlüsse auf individuelle Fahrzeuge gezogen.
                </p>
              </div>

              <div>
                <h3 className="text-white font-bold mb-2">5. Deine Rechte</h3>
                <p>
                  Du hast das Recht auf Auskunft, Berichtigung und Löschung deiner Daten. Da du alle Daten 
                  selbst in der App verwaltest, kannst du diese jederzeit korrigieren oder durch Löschen 
                  deines Accounts vollständig entfernen.
                </p>
              </div>

              <div>
                <h3 className="text-white font-bold mb-2">6. Sicherheit</h3>
                <p>
                  Passwörter werden mittels moderner Hashing-Verfahren (bcrypt) gesichert. 
                  Die Übertragung erfolgt (je nach Server-Konfiguration) verschlüsselt. 
                  Als Nutzer bist du für die Wahl eines sicheren Passworts verantwortlich.
                </p>
              </div>
            </div>
          </motion.section>
        </div>

        <footer className="pt-20 border-t border-white/5 text-center pb-20">
           <p className="text-[10px] text-slate-600 uppercase tracking-widest leading-relaxed">
            Stand: {new Date().toLocaleDateString('de-DE')} • SubBoss Service Desk
          </p>
        </footer>
      </div>
    </div>
  );
}
