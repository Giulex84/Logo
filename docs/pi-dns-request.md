# DNS e revisione app per `iou4088.pi`

Questa nota riassume lo stato dell'app IOU nel Pi Browser e fornisce il testo già pronto da inviare al team Pi per la configurazione DNS.

## Stato attuale e possibili dubbi del team Pi

- **SDK e dominio**: il Pi SDK viene iniettato solo se la pagina è servita su `pi://<appId>.pi`. Finché l'app gira su `*.vercel.app`, l'SDK resta in stato `Waiting` nel pannello "SDK readiness" della home.
- **Validazione Pi**: l'endpoint `/.well-known/pi-validation.txt` è già esposto e restituisce un placeholder. Va sostituito con la chiave ufficiale una volta ricevuta. 【F:app/.well-known/pi-validation.txt/route.ts†L1-L13】
- **Init SDK**: l'inizializzazione del Pi SDK ora legge `NEXT_PUBLIC_PI_SANDBOX`; portala a `false` in produzione per evitare di restare nel sandbox. 【F:lib/pi-sdk.ts†L42-L50】
- **Metadata di dominio**: l'`metadataBase` e l'Open Graph sono stati allineati a `https://iou4088.pi` per mostrare al team Pi che il dominio è pronto. 【F:app/layout.tsx†L7-L21】
- **Flusso auth**: il login client → verifica server è completo. Il backend `/api/pi/verify` rifiuta le richieste se manca la API key (`PI_API_KEY` o `NEXT_PUBLIC_PI_API_KEY`) o l'`accessToken`. 【F:app/api/pi/verify/route.ts†L1-L68】
- **Pagamenti**: il percorso di test usa `createPayment` e mostra messaggi di stato per approval/completion, ma richiede ancora la logica server-side reale per approvare e completare le transazioni. 【F:app/page.tsx†L106-L205】
- **Policy pages**: Terms e Privacy sono presenti e in inglese, come richiesto dalle linee guida Pi. 【F:app/terms/page.tsx†L1-L43】【F:app/privacy/page.tsx†L1-L42】

## Elementi accettabili / da migliorare prima del ticket

- ✅ **UI e contenuti**: tutto il testo è in inglese, include spiegazioni Pi-specifiche e sezioni policy dedicate. Nessun placeholder vistoso sul layout principale.
- ✅ **Pi SDK injection**: lo script Pi è caricato globalmente (`afterInteractive`), quindi non richiede ulteriori modifiche per il Pi Browser. 【F:app/layout.tsx†L23-L32】
- ⚠️ **Sandbox vs produzione**: impostare `NEXT_PUBLIC_PI_SANDBOX=false` (o rimuoverlo) quando passerai al dominio `iou4088.pi`, per non restare in sandbox.
- ⚠️ **Chiave di validazione**: sostituire il placeholder con la chiave ufficiale appena disponibile.
- ⚠️ **Backend pagamenti**: il client mostra i callback, ma il server non approva/completa ancora i pagamenti. Se il team chiede una prova end-to-end, prepara almeno un endpoint mock che logghi le richieste.

## Messaggio da inviare al team Pi (puoi copiare/incollare)

**Oggetto:** Configurazione DNS per il Pi App ID `iou4088.pi`

Ciao team Pi,

chiedo la configurazione DNS per collegare il dominio `iou4088.pi` al mio deploy Vercel. L'app è pronta nel Pi Browser: login e pagamenti usano il Pi SDK e l'endpoint server-side di verifica. Senza il dominio `iou4088.pi`, il Pi Browser non inietta `window.Pi` perché il sito è ancora servito da `*.vercel.app` e lo stato rimane `SDK status: Waiting`.

Posso procedere con una delle opzioni seguenti (preferenza: TXT per la verifica Vercel):
1) **Record TXT** di verifica Vercel (vi mando subito il valore se confermate che potete aggiungerlo).
2) **Record CNAME** che punti all'host Vercel fornito per `iou4088.pi` (vi inoltro l'hostname appena date l'ok).
3) **Record A/ALIAS** verso l'indirizzo indicato da Vercel, se preferite un puntamento diretto.

**Perché è necessario:** il Pi SDK si attiva solo su `pi://<appId>.pi`. Una volta che `iou4088.pi` punta al deploy Vercel, l'SDK verrà iniettato e l'autenticazione funzionerà con il codice già presente.

**Descrizione tecnica rapida dell'app IOU:**
- Stack: Next.js 14 (App Router) + React 18 + Tailwind CSS, deploy su Vercel.
- SDK: `https://sdk.minepi.com/pi-sdk.js` caricato globalmente; `initializePiSdk` usa `NEXT_PUBLIC_PI_APP_ID` e l'opzione `sandbox` è controllata da `NEXT_PUBLIC_PI_SANDBOX`.
- Login: il client chiama `window.Pi.authenticate(['username','payments'], ...)`, poi invia `authResult` a `POST /api/pi/verify` che a sua volta chiama `/v2/me` con `PI_API_KEY` per validare l'access token.
- Pagamenti: `createPayment` è esposto nel client con callback per approvazione/completion; il server deve approvare/completare con le API Pi (pronto a essere collegato).
- Policies: `/terms` e `/privacy` sono pubblicati e in inglese.

Quando confermate il metodo DNS che preferite (TXT, CNAME o A/ALIAS), vi invio immediatamente il valore esatto da impostare. Questo sblocco è indispensabile per permettere al Pi Browser di iniettare l'SDK sull'host ufficiale `iou4088.pi` e finalizzare l'attivazione dell'app.

Grazie per il supporto!
