# GitHub Stars Crawler

A **Node.js-based crawler** that uses the **GitHub GraphQL API** to collect repositories and their star counts, then stores the data in a **PostgreSQL database**.
This project automates the crawling process using **GitHub Actions**, making it repeatable and reliable without any manual setup or private tokens.

---

## 🚀 Features

* Fetches **100,000 repositories** using GitHub GraphQL API
* Respects **GitHub rate limits** and includes retry logic
* Saves data into a **PostgreSQL** database using efficient UPSERT operations
* Exports data to a CSV file
* Fully automated with **GitHub Actions** workflow (no secrets needed)
* Extensible schema for future metadata (issues, PRs, commits, etc.)

---

## 🛠️ Tech Stack

* **Node.js**
* **PostgreSQL**
* **GitHub Actions**
* **GraphQL API**
* Libraries: `axios`, `pg`, `async-retry`, `dotenv`, `csv-writer`

---

## 📂 Project Structure

```
├── crawler.js          # Crawls GitHub repositories and inserts data into DB
├── db.js               # Handles DB connection and schema creation
├── dump.js             # Exports data from DB to CSV
├── schema.sql          # Database schema
├── .github/workflows/
│   └── crawl.yml       # GitHub Actions CI/CD pipeline
├── DESIGN.md           # Detailed architecture and scaling explanation
└── README.md           # Project setup and usage guide
```

---

## ⚙️ Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/<your-username>/github-crawler.git
cd github-crawler
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Run Locally (Optional)

You’ll need a local PostgreSQL instance running:

```bash
node crawler.js
```

This will:

* Fetch repositories from GitHub’s GraphQL API
* Insert data into the `repositories` table
* Export a `repos_dump.csv` file containing the crawled data

---

## 🧠 GitHub Actions Pipeline

The CI/CD workflow (`crawl.yml`) automatically:

1. Spins up a **PostgreSQL service container**
2. Runs `schema.sql` to create the DB schema
3. Executes `crawler.js` to collect data
4. Dumps DB data into `repos_dump.csv`
5. Uploads the file as a downloadable artifact in GitHub Actions

You can trigger it:

* **Manually** via *workflow_dispatch*
* **Automatically** every night at 2 AM (UTC)

---

## 🗄️ Database Schema

```sql
CREATE TABLE IF NOT EXISTS repositories (
  repo_node_id TEXT PRIMARY KEY,
  repo_db_id BIGINT,
  name TEXT,
  owner TEXT,
  stars INT,
  url TEXT,
  last_updated TIMESTAMP DEFAULT NOW()
);
```

Efficient updates are done using UPSERT:

```sql
ON CONFLICT (repo_node_id) DO UPDATE
SET stars = EXCLUDED.stars, last_updated = NOW();
```

---

## 📈 Future Scalability

For 500M+ repositories:

* Use **distributed databases** like Citus or CockroachDB
* Split crawling into multiple workers with separate GitHub tokens
* Use **message queues** for job coordination
* Store older data in cheaper storage (e.g., AWS S3 or BigQuery)

---

## 📘 Documentation

See [`DESIGN.md`](./DESIGN.md) for:

* Detailed architecture breakdown
* Schema evolution plans
* Scaling strategy
* Software engineering principles followed

---

## 🧩 Author

Developed by **Shoaib Akhtar**
Python Tutor | Full Stack Developer

---

