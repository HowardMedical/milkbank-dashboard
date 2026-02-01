# 🥛 HMBANA Milk Bank Pipeline Dashboard

A collaborative pipeline tracker for Howard Medical's milk bank sales efforts.

## Pipeline Stages

1. **❓ Unknown** - Pasteurization compatibility not yet determined
2. **✅ Compatible** - Confirmed our bottles work with their system
3. **📦 Sampled** - Samples sent and being evaluated
4. **🏆 Converted** - Customer! Actively ordering

## Tech Stack

- React + Vite
- Tailwind CSS
- Firebase Firestore

## Development

```bash
npm install
npm run dev
```

## Deployment

Connected to Vercel for automatic deployments from main branch.

## Data

Uses Firebase Firestore collection: `milkbanks`

Fields:
- `name` - Milk bank name
- `location` - City, State
- `contact` - Primary contact name
- `email` - Contact email
- `phone` - Contact phone
- `stage` - unknown | compatible | sampled | converted
- `notes` - Free text notes
- `nextAction` - Date for next follow-up
- `lastContact` - Date of last contact
- `createdAt` - Timestamp
- `updatedAt` - Timestamp

---

Built by Howard Medical | Managed by Ellis 🎯
