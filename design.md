# Design Document – GitHub Stars Crawler

## 1. Overview

This project is a GitHub crawler built in **Node.js** that collects information about GitHub repositories (mainly their star counts) using the **GitHub GraphQL API**.
The goal is to fetch data for **100,000 repositories**, store it in a **PostgreSQL** database, and make the whole process automated using **GitHub Actions**.

The crawler handles rate limits, retries on failures, and can be extended to collect additional metadata later on.
All runs are done using the default GitHub token, so no personal or private credentials are required.

---

## 2. System Design

### Tech Stack

* **Language:** Node.js (ES Modules)
* **Database:** PostgreSQL (service container inside GitHub Actions)
* **CI/CD:** GitHub Actions workflow (`crawl.yml`)
* **API:** GitHub GraphQL v4
* **Libraries Used:**

  * `axios` → for making API calls
  * `pg` → for PostgreSQL connection
  * `async-retry` → for retry logic
  * `dotenv` → for environment variables
  * `csv-writer` → for exporting DB data as CSV

### Architecture

The project follows a clean separation of responsibilities:

| File                          | Responsibility                                             |
| ----------------------------- | ---------------------------------------------------------- |
| `crawler.js`                  | Handles crawling logic, API pagination, and rate limits    |
| `db.js`                       | Handles DB connection, schema creation, and upsert queries |
| `dump.js`                     | Exports DB content to CSV                                  |
| `schema.sql`                  | Contains the SQL schema definition                         |
| `.github/workflows/crawl.yml` | Automates the pipeline using GitHub Actions                |

This separation makes it easy to modify or extend any part later without affecting the others.

---

## 3. Database Schema

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

* **`repo_node_id`** acts as a unique key from GitHub.
* Data is inserted using `UPSERT` (`ON CONFLICT DO UPDATE`), so the same repo is updated instead of re-inserted.
* This makes the daily crawling efficient and prevents duplication.

---

## 4. Handling Rate Limits and Reliability

* Every GraphQL call checks the remaining **rate limit** and automatically sleeps until reset when approaching the limit.
* Network or temporary GitHub API errors are retried with **exponential backoff**.
* A short delay (`sleep(200ms)`) between pages prevents burst traffic.
* The system is designed to be **resilient** and **self-recovering** even if a few requests fail.

---

## 5. GitHub Actions Workflow

The workflow (`crawl.yml`) automates everything:

1. Starts a Postgres container.
2. Creates the database schema.
3. Runs the crawler to fetch repos and insert them into the DB.
4. Dumps the DB data to `repos_dump.csv`.
5. Uploads that CSV file as an artifact that can be downloaded from the Actions tab.

The workflow runs:

* **Manually (workflow_dispatch)**
* **Automatically every night at 2 AM (UTC)**

---

## 6. Scaling Plan (For 500 Million Repositories)

If we need to scale this system to 500 million repos, the main idea is **divide and parallelize**.

### a. Database Layer

* Use a distributed Postgres solution (like **Citus**, **CockroachDB**, or **TimescaleDB**) to handle huge datasets.
* Partition repositories by hash of their ID (`MOD(repo_db_id, N)`).
* Use bulk insert operations (`COPY FROM STDIN`) instead of individual inserts.

### b. Crawler Layer

* Instead of a single crawler, use **multiple workers** in parallel (each with its own GitHub token and query range).
* Use a message queue (e.g., RabbitMQ or Redis Queue) to coordinate crawlers.
* Implement incremental crawling (only update repos changed since last run).

### c. Storage Optimization

* Move older data to cheaper long-term storage (like S3 or BigQuery).
* Keep only the latest snapshot in Postgres for fast access.

---

## 7. Schema Evolution for Future Metadata

To store more information (issues, PRs, comments, commits, etc.), each entity gets its own table linked to `repositories(repo_node_id)`.

Example:

```sql
CREATE TABLE pull_requests (
  id BIGSERIAL PRIMARY KEY,
  repo_node_id TEXT REFERENCES repositories(repo_node_id),
  pr_id TEXT,
  title TEXT,
  author TEXT,
  state TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE TABLE pr_comments (
  id BIGSERIAL PRIMARY KEY,
  pr_id TEXT,
  comment_id TEXT,
  author TEXT,
  body TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

* Each PR or comment has a separate row.
* When a PR gets new comments, only new rows are added — no rewriting old data.
* This minimizes the number of updated rows and keeps performance stable.

---

## 8. Software Engineering Practices Followed

* **Clean Architecture:** Database, logic, and crawler layers are fully separated.
* **Immutability:** Crawled data is treated as immutable; only changes are updated using UPSERT.
* **Retry & Fault Tolerance:** Automatic retries for transient errors.
* **Anti-Corruption Layer:** All DB logic is inside `db.js`; the crawler never directly manipulates SQL.
* **Automation:** Complete CI/CD pipeline runs with no manual steps or secrets.

---

## 9. Future Improvements

* Add incremental crawling (fetch only recently updated repositories).
* Store rate-limit metrics for monitoring.
* Add unit tests for DB and API layers.
* Visualize results (e.g., top repositories by stars).
* Support additional data types like issues, PRs, comments, and CI checks.

---

## 10. Summary

This crawler is designed to be:

* **Reliable** – handles errors and rate limits gracefully
* **Efficient** – avoids duplicate inserts via upserts
* **Scalable** – architecture ready for distributed expansion
* **Maintainable** – clean modular code and automated CI/CD pipeline

Overall, it satisfies the assignment’s main goals while keeping room for easy future extension.
