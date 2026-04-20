# Scacchi

Piccolo gioco di scacchi in HTML + CSS + JavaScript puro. Due giocatori sullo stesso dispositivo (hotseat). Nessuna dipendenza, nessun build step: basta aprire `index.html` nel browser.

## Funzionalità

- Due modalità: **2 giocatori** (hotseat) o **contro il computer**
- AI con 3 livelli di difficoltà (Facile / Media / Difficile), basata su minimax con alpha-beta pruning e piece-square tables
- Tutte le mosse regolamentari, arrocco, en passant, promozione
- Rilevamento di scacco, scacco matto e stallo
- Pulsanti "Nuova partita", "Annulla mossa", "Ruota scacchiera"
- Storico mosse in notazione algebrica semplificata
- Pezzi catturati visibili a lato

## Come giocare contro il computer

Nel pannello laterale scegli "Contro il computer", poi seleziona di che colore gioca la macchina e il livello di difficoltà. Se scegli che il computer gioca con il Bianco, muoverà lui per primo.

## Come giocare in locale

1. Clicca due volte su `index.html` (o aprilo con il browser)
2. Clicca il pezzo che vuoi muovere, poi la casa di destinazione

## Mettere il progetto su GitHub

1. **Crea il repository su GitHub**
   - Vai su <https://github.com/new>
   - Nome del repository, per esempio `scacchi`
   - Lascialo pubblico, non aggiungere README/licenza (ce l'abbiamo già)
   - Clicca "Create repository"

2. **Carica i file dal terminale** (dalla cartella del progetto):

   ```bash
   cd "/Users/riccardosaporiti/Documents/Claude Code/Scacchi"
   git init
   git add .
   git commit -m "Prima versione del gioco di scacchi"
   git branch -M main
   git remote add origin https://github.com/TUO_USERNAME/scacchi.git
   git push -u origin main
   ```

   Sostituisci `TUO_USERNAME` con il tuo username GitHub.

## Pubblicare online con GitHub Pages (per giocarci ovunque)

1. Nel tuo repository vai su **Settings → Pages**
2. Alla voce "Build and deployment" → "Source" scegli **Deploy from a branch**
3. Seleziona branch **main** e cartella **/ (root)**, poi **Save**
4. Aspetta ~1 minuto: GitHub ti darà un link tipo
   `https://TUO_USERNAME.github.io/scacchi/`
5. Quel link è il tuo gioco, raggiungibile da qualunque dispositivo con un browser

## Aggiornare il gioco in futuro

Dopo aver modificato qualche file:

```bash
git add .
git commit -m "Descrizione della modifica"
git push
```

GitHub Pages si aggiorna da solo nel giro di un minuto.
