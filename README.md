# OIC App

Web application for managing OIC tokens, staking, and voting.
Compatible with the OIC Skill for AI agent interaction.

## Features

- **Token Dashboard** — View token balance and staked amount
- **Staking** — Stake OIC tokens with lock-up multipliers
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
npm install
npm run dev
```

## Tech Stack

- Node.js + Express
- ethers.js for blockchain interaction
- Simple HTML/CSS/JS frontend

---

*Voluntary adherence. Direct liability. Global contract.*
