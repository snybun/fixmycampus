# FixMyCampus

> **"Report. Track. Improve."**  
> *Facility Defect and Maintenance Reporting System*

FixMyCampus is a web-based campus facility defect and maintenance reporting system designed for students, faculty, and administrative staff to report, track, and manage physical plant repairs across campus buildings, classrooms, laboratories, restrooms, and grounds.

---

## 🛠️ Tech Stack (Phase 1)

- **Backend Runtime**: PHP 8.3 (Apache)
- **Database**: MySQL 8.0 (InnoDB, `utf8mb4_unicode_ci`)
- **Database Abstraction**: Native PHP PDO (Singleton pattern with prepared statements)
- **Containerization**: Docker & Docker Compose
- **Database Management GUI**: phpMyAdmin
- **Orchestration**: Multi-container network with persistent volumes and health checks

---

## 📁 Project Directory Structure

```
fixmycampus/
├── .env.example                 # Example environment configuration
├── .env                         # Active local environment configuration
├── .gitignore                   # Git ignore rules
├── docker-compose.yml           # Docker multi-container service definition
├── Dockerfile                   # Custom PHP 8.3 + Apache container image
├── README.md                    # Project documentation
├── database/
│   └── init/
│       ├── 01_schema.sql        # MySQL 8 DDL (13 relational tables & constraints)
│       └── 02_seed.sql          # Seed data (roles, users, categories, buildings, tickets)
├── docker/
│   └── apache/
│       └── vhost.conf           # Apache VirtualHost configuration
├── public/
│   ├── index.php                # Backend environment & database status dashboard
│   ├── health.php               # JSON health check endpoint for monitoring
│   └── uploads/
│       └── .gitkeep             # File attachment & proof upload directory
└── src/
    └── Core/
        ├── Database.php         # PDO connection singleton manager
        ├── Env.php              # Lightweight .env file parser & loader
        └── Response.php         # JSON response and HTTP status helper
```

---

## 🐳 Docker Services & Network Topology

| Service | Container Name | Image / Base | Internal Port | Host Port | Purpose |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`app`** | `fixmycampus_app` | `php:8.3-apache` | `80` | `8080` | Main application server |
| **`database`** | `fixmycampus_db` | `mysql:8.0` | `3306` | `3306` | Persistent MySQL 8 database |
| **`phpmyadmin`**| `fixmycampus_phpmyadmin` | `phpmyadmin:latest` | `80` | `8081` | Web GUI for database management |

---

## 🚀 Quick Start Guide

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Windows / macOS / Linux)

### 1. Clone & Setup Environment
Ensure your environment file is configured (pre-configured with defaults):
```bash
# If .env does not exist yet:
cp .env.example .env
```

### 2. Start the Development Environment
Launch all services with a single command:
```bash
docker compose up -d --build
```

### 3. Access Services
- **FixMyCampus Backend Dashboard**: [http://localhost:8080](http://localhost:8080)
- **JSON Healthcheck**: [http://localhost:8080/health.php](http://localhost:8080/health.php)
- **phpMyAdmin Web GUI**: [http://localhost:8081](http://localhost:8081)
  - **Server**: `database`
  - **Username**: `fmc_user` (or `root`)
  - **Password**: `admin`

### 4. Stop Services
```bash
# Stop containers while preserving database volume
docker compose down

# Stop containers and remove volumes (resets database)
docker compose down -v
```

---

## 🔐 Default Seed Accounts

The database is automatically initialized and seeded upon container creation with demo accounts (hashed with bcrypt):

| Role | Name | Email | Password | Identifier |
| :--- | :--- | :--- | :--- | :--- |
| **Administrator** | System Administrator | `admin@fixmycampus.edu` | `Admin@1234` | `ADM-001` |
| **Maintenance Supervisor** | Robert Vance | `supervisor@fixmycampus.edu` | `Supervisor@1234` | `MGT-001` |
| **Maintenance Technician** | John Miller | `worker.john@fixmycampus.edu` | `Worker@1234` | `TEC-001` |
| **Maintenance Technician** | Carlos Ramos | `worker.carlos@fixmycampus.edu`| `Worker@1234` | `TEC-002` |
| **Faculty Member** | Dr. Sarah Smith | `prof.smith@fixmycampus.edu` | `Faculty@1234` | `FAC-101` |
| **Student** | Alex Johnson | `student.alex@fixmycampus.edu` | `Student@1234` | `STU-202401` |
| **Student** | Emily Chen | `student.emily@fixmycampus.edu` | `Student@1234` | `STU-202402` |

---

## 🗄️ Database Architecture (`fixmycampus_db`)

The database consists of **13 normalized tables**:

1. **`roles`**: System roles (`admin`, `supervisor`, `technician`, `faculty`, `student`).
2. **`users`**: User records, credentials, identifiers, and department affiliations.
3. **`categories`**: Defect classifications (Chairs/Furniture, AC/HVAC, Lighting, Whiteboards, AV Equipment, Restroom/Plumbing, Internet, Cleaning, Safety, Grounds, Other).
4. **`buildings`**: Campus buildings (`ENG-BLDG`, `SCI-HALL`, `ADM-CTR`, `LIB-MAIN`, `SPT-CMP`).
5. **`floors`**: Floor definitions per building (Ground, 1st, 2nd, 3rd Floor).
6. **`locations`**: Specific rooms, classrooms, laboratories, restrooms, and outdoor areas.
7. **`reports`**: Main defect ticket reports with tracking numbers (`FMC-YYYYMM-XXXX`), priority levels (`low`, `medium`, `high`, `emergency`), and lifecycle statuses (`submitted`, `under_review`, `assigned`, `in_progress`, `on_hold`, `resolved`, `closed`, `rejected`).
8. **`report_attachments`**: Photos and documents supporting initial defect evidence and completion proof.
9. **`report_assignments`**: Work orders assigning technicians with target completion dates and supervisor notes.
10. **`report_status_history`**: Audit trail of all status transitions, timestamps, and remarks.
11. **`repair_completions`**: Maintenance completion signoff, parts replaced, cost, and supervisor verification.
12. **`report_feedback`**: Reporter 1-to-5 star rating and feedback comments upon ticket resolution.
13. **`notifications`**: User alert queue for status changes and assignment notifications.

---

## ⚙️ Environment Variables Reference

All credentials and runtime settings are configured via `.env`:

```env
# Application
APP_NAME=FixMyCampus
APP_TAGLINE="Report. Track. Improve."
APP_ENV=development
APP_DEBUG=true
APP_URL=http://localhost:8080
APP_PORT=8080

# Database
DB_HOST=database
DB_PORT=3306
DB_DATABASE=fixmycampus_db
DB_USERNAME=fmc_user
DB_PASSWORD=admin
DB_ROOT_PASSWORD=admin

# phpMyAdmin
PMA_PORT=8081
PMA_UPLOAD_LIMIT=64M
```

---

## 🧭 Project Roadmap

- [x] **Phase 1**: Database Architecture & Docker Environment Setup *(Current)*
- [ ] **Phase 2**: Backend Authentication & Core Data Access Layer
- [ ] **Phase 3**: User Frontend (Public Portal, Reporting Form, Ticket Tracking)
- [ ] **Phase 4**: Maintenance & Admin Dashboard (Dispatch, Work Orders, Completion Proof Uploads)
