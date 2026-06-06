# ResumeLens — AI Resume Analyzer

ResumeLens is an AI-powered resume analyzer that reviews PDF resumes against a target job role, scores them out of 100, and emails a detailed improvement report straight to the user's inbox via Gmail.

Built with **TanStack Start**, **React 19**, **Tailwind CSS v4**, **Google Gemini**, and the **Gmail API**.

---

## ✨ Features

- 📄 **PDF Upload** — drag-and-drop or click to upload a resume (PDF only)
- 🎯 **Role-aware analysis** — Backend, Frontend, HR, or any custom role; leave blank for a general evaluation
- 🤖 **AI scoring (0–100)** — strengths, weaknesses, missing skills, ATS feedback, and actionable suggestions
- 📬 **Email report** — a beautifully formatted HTML report is sent to the user's email via Gmail
- 🎨 **Modern Indigo/Violet UI** — dark theme, Space Grotesk + Inter typography
- ⚡ **Edge-ready** — runs on TanStack Start server functions

---

## 🧩 Tech Stack

| Layer | Tech |
| --- | --- |
| Framework | TanStack Start v1 + React 19 |
| Build | Vite 7 |
| Styling | Tailwind CSS v4 (OKLCH tokens in `src/styles.css`) |
| AI | Google Gemini (`gemini-3-flash-preview`) |
| Email | Gmail API |
| PDF parsing | [`unpdf`](https://www.npmjs.com/package/unpdf) |
| Validation | Zod |

---

## 🚀 How it works

1. User uploads a PDF resume and (optionally) picks a target role + enters their email.
2. The `analyzeResume` server function (`src/lib/analyze.functions.ts`):
   - Decodes the PDF and extracts text with `unpdf`.
   - Calls the AI model with a structured tool (`submit_resume_analysis`) to enforce JSON output.
   - Builds an HTML report and sends it via the Gmail API.
3. The frontend (`src/routes/index.tsx`) shows the score, summary, and categorized feedback while the email lands in the inbox.

---

## 🛠️ Local development

```bash
bun install
bun dev
```

Open [http://localhost:8080](http://localhost:8080).

### Required environment variables

- `LOVABLE_API_KEY` — AI gateway key
- `GOOGLE_MAIL_API_KEY` — Gmail API key

---

## 📁 Project structure

```
src/
├── lib/
│   └── analyze.functions.ts   # PDF extraction + AI call + Gmail send
├── routes/
│   ├── __root.tsx             # App shell, fonts, meta
│   └── index.tsx              # Upload UI + results dashboard
└── styles.css                 # Indigo/violet design tokens
```

---

## 👥 Target users

Students, job seekers, freshers, and developers preparing for interviews who want fast, role-specific resume feedback.

---

## 📄 License

MIT
