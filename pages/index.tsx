import { useCallback, useEffect, useState } from "react";
import Head from "next/head";

declare global {
  interface Window { Pi: any; }
}

type CardType = { id: number; value: string; flipped: boolean; matched: boolean };
type VerifiedSession = { uid: string; username: string | null; premium: boolean; entitlementStoreReady: boolean };

const symbols = ["⚔", "🔥", "🛡", "🏹", "👑", "💎", "⚡", "🩸", "🧠", "🐉", "🌑", "☠", "🍄", "⭐", "🌪", "🧊", "🌋", "🧿"];

export default function ArenaMainnet() {
  const [cards, setCards] = useState<CardType[]>([]);
  const [selected, setSelected] = useState<CardType[]>([]);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [lives, setLives] = useState(5);
  const [combo, setCombo] = useState(0);
  const [isPremium, setIsPremium] = useState(false);
  const [uid, setUid] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [storeReady, setStoreReady] = useState(false);
  const [status, setStatus] = useState("Connecting to Pi...");
  const [isHeal, setIsHeal] = useState(false);
  const [isShake, setIsShake] = useState(false);
  const [loading, setLoading] = useState(true);
  const [paymentBusy, setPaymentBusy] = useState(false);

  const initGame = useCallback((levelValue: number, premiumValue: boolean) => {
    const size = levelValue === 1 ? 2 : levelValue <= 3 ? 4 : 6;
    const pairCount = (size * size) / 2;
    setLives(premiumValue ? 999 : Math.min(5 + (levelValue - 1), 10));
    const chosen = symbols.slice(0, pairCount);
    const deck = [...chosen, ...chosen]
      .map((value, index) => ({ id: index, value, flipped: false, matched: false }))
      .sort(() => Math.random() - 0.5);
    setCards(deck);
    setSelected([]);
    setCombo(0);
  }, []);

  const onIncompletePaymentFound = useCallback(async (payment: any) => {
    const paymentId = payment?.identifier;
    if (!paymentId) return;
    const txid = payment?.transaction?.txid || "";
    await fetch("/api/payments/recover", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentId, txid }),
    });
  }, []);

  useEffect(() => {
    let active = true;
    const initPi = async () => {
      if (!window.Pi) return;
      try {
        window.Pi.init({ version: "2.0", sandbox: false });
        const auth = await window.Pi.authenticate(["username", "payments"], onIncompletePaymentFound);
        if (!auth?.accessToken) throw new Error("Pi did not return an access token");

        const verify = await fetch("/api/auth/verify", {
          method: "POST",
          headers: { Authorization: `Bearer ${auth.accessToken}` },
        });
        if (!verify.ok) throw new Error("Server could not verify Pi identity");
        const session = (await verify.json()) as VerifiedSession;
        if (!active) return;

        setAccessToken(auth.accessToken);
        setUid(session.uid);
        setUsername(session.username);
        setIsPremium(session.premium);
        setStoreReady(session.entitlementStoreReady);
        setStatus(session.entitlementStoreReady ? "Online · verified by Pi" : "Online · Premium temporarily unavailable");
        setLoading(false);
        initGame(1, session.premium);
      } catch (err: any) {
        if (!active) return;
        setStatus(`Authentication unavailable${err?.message ? `: ${err.message}` : ""}`);
        setLoading(false);
      }
    };

    if (window.Pi) initPi();
    else window.addEventListener("pi_sdk_ready", initPi, { once: true });
    return () => { active = false; window.removeEventListener("pi_sdk_ready", initPi); };
  }, [initGame, onIncompletePaymentFound]);

  const handleFlip = (card: CardType) => {
    if (card.flipped || card.matched || selected.length === 2 || (!isPremium && lives <= 0)) return;
    const updatedCards = cards.map(c => c.id === card.id ? { ...c, flipped: true } : c);
    setCards(updatedCards);
    const newSelected = [...selected, { ...card, flipped: true }];
    setSelected(newSelected);
    if (newSelected.length === 2) setTimeout(() => checkMatch(newSelected, updatedCards), 500);
  };

  const checkMatch = (pair: CardType[], currentCards: CardType[]) => {
    const [a, b] = pair;
    if (a.value === b.value) {
      const newCombo = combo + 1;
      setCombo(newCombo);
      if (!isPremium && lives < 10) {
        setLives(prev => prev + 1);
        setIsHeal(true);
        setTimeout(() => setIsHeal(false), 500);
      }
      const updatedMatched = currentCards.map(c => c.value === a.value ? { ...c, matched: true } : c);
      setCards(updatedMatched);
      setScore(prev => prev + (isPremium ? 20 : 10) * newCombo + (newCombo === 3 ? 50 : 0));
      if (updatedMatched.every(c => c.matched)) {
        const next = level + 1;
        setLevel(next);
        setTimeout(() => initGame(next, isPremium), 850);
      }
    } else {
      setCombo(0);
      if (!isPremium) {
        setLives(prev => Math.max(0, prev - 1));
        setIsShake(true);
        setTimeout(() => setIsShake(false), 400);
      }
      setCards(currentCards.map(c => (c.id === a.id || c.id === b.id) ? { ...c, flipped: false } : c));
    }
    setSelected([]);
  };

  const unlockPremium = () => {
    if (!uid || !accessToken || !storeReady || paymentBusy) return;
    setPaymentBusy(true);
    setStatus("Opening Pi Wallet...");

    window.Pi.createPayment(
      {
        amount: 1,
        memo: "Arena Premium Unlock",
        metadata: { product: "arena_premium_v1" },
      },
      {
        onReadyForServerApproval: async (paymentId: string) => {
          const res = await fetch("/api/payments/approve", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
            body: JSON.stringify({ paymentId }),
          });
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            setPaymentBusy(false);
            setStatus(data?.error || "Payment approval failed");
            throw new Error(data?.error || "Payment approval failed");
          }
        },
        onReadyForServerCompletion: async (paymentId: string, txid: string) => {
          const res = await fetch("/api/payments/complete", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
            body: JSON.stringify({ paymentId, txid }),
          });
          const data = await res.json().catch(() => ({}));
          setPaymentBusy(false);
          if (!res.ok || !data?.premium) {
            setStatus(data?.error || "Payment is not fully verified yet");
            return;
          }
          setIsPremium(true);
          initGame(level, true);
          setStatus("Premium active on your verified Pi account ✅");
        },
        onCancel: () => { setPaymentBusy(false); setStatus("Payment cancelled"); },
        onError: () => { setPaymentBusy(false); setStatus("Payment error"); },
      }
    );
  };

  return (
    <div className="container">
      <Head>
        <title>Arena · Pi Mainnet</title>
        <meta name="description" content="Arena is a skill-based memory game for Pi Network Pioneers." />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      </Head>
      <main className="app">
        <h2 className="title">⚔ ARENA ⚔</h2>
        {uid && <div className="identity">{username ? `@${username}` : "Verified Pioneer"}</div>}
        {uid && (
          <div className="game-stats">
            <div className="stat-item">LVL <span>{level}</span></div>
            <div className={`stat-item ${isHeal ? "heal" : ""}`}>HP <span>{isPremium ? "∞" : lives}</span></div>
            <div className="stat-item">PTS <span>{score}</span></div>
          </div>
        )}
        <div className="combo-zone">{combo >= 3 ? "🔥 TRIPLE COMBO · +50 PTS" : combo > 0 ? `COMBO X${combo}!` : ""}</div>
        {loading ? <div className="loader">Connecting...</div> : uid ? (
          <div className={`grid-container ${isShake ? "shake" : ""}`} style={{ gridTemplateColumns: `repeat(${level === 1 ? 2 : level <= 3 ? 4 : 6}, 1fr)` }}>
            {cards.map(card => (
              <button key={card.id} type="button" aria-label={card.flipped || card.matched ? `Card ${card.value}` : "Hidden card"}
                className={`card ${card.flipped || card.matched ? "flipped" : ""}`} onClick={() => handleFlip(card)}>
                <span className="card-content">{card.flipped || card.matched ? card.value : ""}</span>
              </button>
            ))}
          </div>
        ) : <div className="auth-note">Open Arena inside Pi Browser and authorize Pi sign-in to play.</div>}
        {!isPremium && uid && (
          <button className="premium-btn" onClick={unlockPremium} disabled={!storeReady || paymentBusy}>
            {paymentBusy ? "PROCESSING..." : storeReady ? "UNLOCK PREMIUM (1.0 π)" : "PREMIUM TEMPORARILY UNAVAILABLE"}
          </button>
        )}
        {isPremium && <div className="premium-active">★ Premium verified</div>}
        <div className="status-console">{status}</div>
      </main>
      <footer className="footer"><a href="/privacy.html">Privacy</a><span className="divider">|</span><a href="/terms.html">Terms</a></footer>
      <style jsx>{`
        .container{background:#05050a;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:'Segoe UI',sans-serif;color:#fff;padding:18px 0}.app{width:90%;max-width:400px;background:#111122;padding:20px;border-radius:30px;border:2px solid #222244;box-shadow:0 20px 50px rgba(0,0,0,.5);text-align:center}.title{color:#ff3e3e;letter-spacing:4px;text-shadow:0 0 15px rgba(255,62,62,.4);margin:0 0 8px}.identity{font-size:.75rem;color:#999;margin-bottom:14px}.game-stats{display:flex;justify-content:space-between;margin-bottom:15px;background:#000;padding:10px 15px;border-radius:15px;border:1px solid #333}.stat-item{font-weight:bold;font-size:.8rem;color:#aaa}.stat-item span{display:block;color:#fff;font-size:1.1rem}.heal{animation:pulse-green .5s}.combo-zone{height:25px;color:#ffb300;font-weight:bold;font-size:.9rem;margin-bottom:10px}.grid-container{display:grid;gap:8px;margin:0 auto 20px}.card{aspect-ratio:1;background:#1a1a35;border:1px solid #333366;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:1.5rem;transition:.3s;cursor:pointer;color:#fff;padding:0}.card.flipped{background:#ff3e3e;border-color:#ff7676;transform:rotateY(180deg)}.card-content{transform:rotateY(180deg)}.premium-btn{width:100%;background:linear-gradient(45deg,#ffb300,#ff8c00);color:#000;border:none;padding:15px;border-radius:15px;font-weight:bold;font-size:.9rem;cursor:pointer}.premium-btn:disabled{opacity:.55;cursor:not-allowed}.premium-active{color:#ffb300;font-weight:700;margin-top:4px}.status-console{margin-top:15px;font-family:monospace;font-size:.7rem;color:#00ff00;background:#000;padding:8px;border-radius:8px;overflow-wrap:anywhere}.auth-note{padding:24px 10px;color:#bbb}.footer{margin-top:20px;font-size:.8rem}.footer a{color:#777;text-decoration:none}.divider{margin:0 10px;color:#333}.shake{animation:shake .4s}@keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-5px)}75%{transform:translateX(5px)}}@keyframes pulse-green{0%{transform:scale(1);color:#fff}50%{transform:scale(1.2);color:#00ff00}100%{transform:scale(1);color:#fff}}
      `}</style>
    </div>
  );
}
