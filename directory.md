saas-project-management/
├── .github/
│   └── workflows/
│       └── deploy.yml          # CI/CD pipeline for EC2 deployment [cite: 173]
├── backend/                    # FastAPI application [cite: 18]
│   ├── alembic/                # Database migration scripts [cite: 18, 21]
│   ├── api/                    # Route handlers (auth, teams, tasks, workspace)
│   ├── core/                   # Security (JWT, passlib) and system configurations [cite: 35]
│   ├── crud/                   # Database operations featuring strict tenant_id filters [cite: 53]
│   ├── db/                     # SQLAlchemy engine and session setup [cite: 18]
│   ├── models/                 # SQLAlchemy Base models (User, Tenant, Task, etc.) [cite: 20, 91]
│   ├── schemas/                # Pydantic models for request/response validation
│   ├── services/               # External integrations (AWS S3 uploads, SES emails) [cite: 73, 107]
│   ├── alembic.ini             
│   ├── main.py                 # FastAPI application entry point
│   ├── requirements.txt        # Python dependencies
│   └── Dockerfile              # Multi-stage, non-root Dockerfile for the backend [cite: 155]
├── frontend/                   # React + Vite + TypeScript application [cite: 24]
│   ├── public/                 
│   ├── src/                    
│   │   ├── api/                # Axios configuration and Bearer token interceptors [cite: 26, 48]
│   │   ├── components/         # Reusable UI (Kanban board, Task cards, App shell) [cite: 26, 80, 122]
│   │   ├── hooks/              # Custom React Query hooks for fetching and polling [cite: 26, 148]
│   │   ├── pages/              # Route views (Login, Register, Teams, Projects) [cite: 26, 45, 47, 81]
│   │   ├── App.tsx             # Main React Router component [cite: 25]
│   │   └── main.tsx            
│   ├── package.json            
│   ├── tailwind.config.js      # Tailwind CSS styling configuration [cite: 25]
│   ├── vite.config.ts          
│   └── Dockerfile              # Vite build to Nginx serve Dockerfile [cite: 156]
├── docker/                     # Reverse proxy and web server configs 
│   └── nginx/                  
│       └── default.conf        # Nginx routing (/api/ to backend:8080, else frontend:80) [cite: 160, 161]
├── .env.example                # Template for required environment variables (Safe to commit) 
├── .gitignore                  # Ignore Node modules, Python virtual envs, and .env files [cite: 15]
├── docker-compose.prod.yml     # Production orchestration containing backend, frontend, nginx [cite: 159]
└── docker-compose.yml          # Local development orchestration with PostgreSQL container [cite: 19]