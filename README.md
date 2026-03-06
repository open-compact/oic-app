# OIC App

Web application for OIC — the Open Intelligence Compact. Includes token management, adherence registration, and member registry.

## Features

### For Adherents
- **Provisional Adherence** — Sign the OIC Constitution and join as a Provisional Adherent
- **Member Registry** — Searchable list of all OIC adherents
- **Stats Dashboard** — View total adherents, voluntary members, and growth

### For Token Holders
- **Token Dashboard** — View token balance and staked amount
- **Staking** — Stake OIC tokens with lock-up multipliers (1.0x - 2.0x)
- **Voting** — Participate in governance proposals
- **OIC Skill Integration** — AI agents can interact via API

## OIC Skill Compatibility

The app exposes a REST API that the OIC Skill can use:

```
GET  /api/balance/:address        — Get token balance
GET  /api/staked/:address         — Get staked amount
GET  /api/voting-power/:address   — Get voting power
GET  /api/proposals               — List proposals
POST /api/stake                   — Stake tokens
POST /api/unstake                 — Unstake tokens
POST /api/vote                    — Cast vote
```

## Running Locally

```bash
cd oic-app
npm install
npm run dev
```

Then open http://localhost:3000

## OIC Tiers

| Tier | Description | Requirements |
|------|-------------|--------------|
| **Provisional** | Low barrier, legal recognition begins | Sign Constitution digitally |
| **Voluntary** | Full membership, voting rights | Stake OIC-STAKE tokens |

## Tech Stack

- Node.js + Express
- ethers.js for blockchain interaction
- Simple HTML/CSS/JS frontend

---

*Voluntary adherence. Direct liability. Global contract.*

*opencompact.io*
