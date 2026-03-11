<p align="center">
  <img src="https://img.shields.io/badge/React-18.2-61DAFB?style=for-the-badge&logo=react&logoColor=white" alt="React 18" />
  <img src="https://img.shields.io/badge/Vite-6.1-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite 6" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-3.4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Radix_UI-1.0-161618?style=for-the-badge&logo=radixui&logoColor=white" alt="Radix UI" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="MIT License" />
</p>

<h1 align="center">🔗 DecentralScan</h1>

<p align="center">
  <strong>A modern, full-featured blockchain explorer for the DecentralChain (DCC) network.</strong>
</p>

<p align="center">
  Real-time block feeds · Transaction tracing · Address analytics · Asset tracking · DEX pair monitoring · Network topology maps · Node management · Admin dashboard
</p>

<p align="center">
  <a href="#-quick-start">Quick Start</a> ·
  <a href="#-features">Features</a> ·
  <a href="#-architecture">Architecture</a> ·
  <a href="#-deployment">Deployment</a> ·
  <a href="#-contributing">Contributing</a>
</p>

---

## 📖 About

**DecentralScan** is a production-ready, open-source blockchain explorer frontend designed for the **DecentralChain (DCC)** network. Built with **React 18**, **Vite 6**, and **Tailwind CSS**, it provides an intuitive interface for exploring blocks, transactions, addresses, digital assets, and network health in real time.

Whether you're a node operator monitoring uptime, a developer debugging transactions, or a community member tracking token activity — DecentralScan gives you full transparency into chain state with blazing-fast performance and a beautiful, responsive UI.

### Why DecentralScan?

- **Zero backend required** — Connects directly to DCC node REST APIs for live blockchain data
- **Instant search** — Look up any block, transaction, or address from the global search bar
- **Role-based access** — Admin panels for user/node management, public dashboards for everyone
- **Internationalized** — Built-in English & Spanish with easily extensible translations
- **Dark/Light theme** — System-aware theming that respects user preferences
- **Fully tested** — Unit tests (Vitest) + E2E tests (Playwright) + CI pipeline

---

## ✨ Features

### 🔍 Blockchain Explorer
| Feature | Description |
|---------|-------------|
| **Block Feed** | Live-streaming block list with height, timestamp, transaction count, and generator |
| **Block Detail** | Full block inspection — header fields, all transactions, reward breakdown |
| **Transaction View** | Detailed tx pages with inputs, outputs, proofs, smart contract invocations |
| **Transaction Map** | Visual flow of value transfers within a transaction |
| **Address Page** | Balance, asset portfolio, transaction history, and aliases for any address |
| **Asset Page** | Token metadata, supply info, issuer details, recent transfers |
| **Unconfirmed Pool** | Real-time view of the mempool with pending transactions |

### 📊 Analytics & Dashboards
| Feature | Description |
|---------|-------------|
| **Network Dashboard** | At-a-glance stats — block height, total transactions, active nodes, TPS |
| **Network Statistics** | Historical charts for transactions, blocks, fees, and network activity |
| **DEX Pairs** | Decentralized exchange pair listings with price, volume, and liquidity data |
| **Admin Analytics** | Admin-only dashboards with user growth, page views, and system metrics |
| **Sustainability View** | Energy and sustainability metrics for the DCC proof-of-stake network |

### 🌐 Network & Nodes
| Feature | Description |
|---------|-------------|
| **Network Map** | Interactive geographic map of all known network nodes (Leaflet) |
| **Peers List** | Connected peer table with version, height, and latency |
| **Node Registration** | Public form for community members to register & track their DCC nodes |
| **Admin Node Management** | Approve/reject node registrations, configure ownership percentages |

### 👤 User System
| Feature | Description |
|---------|-------------|
| **Authentication** | Register/login with email & password, role-based access (user/admin) |
| **User Dashboard** | Personal dashboard with watched addresses, bookmarked transactions |
| **Profile Management** | Update display name, email, and preferences |
| **Admin Panel** | Full user management — role assignment, account editing, node config |

### 🛠 Developer Experience
| Feature | Description |
|---------|-------------|
| **Vite 6 + HMR** | Sub-second hot module replacement for rapid development |
| **Path Aliases** | Clean `@/` imports mapped to `src/` |
| **Code Splitting** | Automatic vendor chunking for optimal bundle sizes |
| **Vitest** | Fast unit testing with React Testing Library |
| **Playwright** | End-to-end browser tests with CI integration |
| **ESLint** | Consistent code quality enforcement |
| **CI/CD** | GitHub Actions pipeline — lint, typecheck, test, build on every push |
| **Docker** | Production-ready multi-stage Docker build with Nginx |

---

## 🏗 Architecture

```
dccscan_new_frontend/
├── .github/
│   └── workflows/ci.yml        # GitHub Actions CI pipeline
├── e2e/                         # Playwright E2E tests
├── src/
│   ├── api/
│   │   ├── auth.js              # Authentication module (register/login/logout)
│   │   ├── entities.js          # Entity CRUD factory (localStorage)
│   │   └── integrations.js      # File upload & utility integrations
│   ├── components/
│   │   ├── analytics/           # Analytics tracking components
│   │   ├── contexts/            # React contexts (Language, etc.)
│   │   ├── dashboard/           # Dashboard widget components
│   │   ├── shared/              # Shared components (SearchBar, CopyButton)
│   │   ├── ui/                  # 44+ Radix UI primitives (shadcn/ui)
│   │   ├── ErrorBoundary.jsx    # Global error boundary with recovery
│   │   ├── ProtectedRoute.jsx   # Auth & role-based route guard
│   │   └── ThemeProvider.jsx    # Dark/light theme provider
│   ├── hooks/                   # Custom React hooks
│   ├── lib/
│   │   ├── AuthContext.jsx      # Auth state context & provider
│   │   ├── query-client.js      # React Query configuration
│   │   └── utils.js             # Utility functions (cn, etc.)
│   ├── pages/                   # 24 page components (see Features)
│   ├── App.jsx                  # Root component with routing
│   ├── Layout.jsx               # Shell layout (nav, header, footer)
│   └── main.jsx                 # Entry point
├── Dockerfile                   # Multi-stage production build
├── docker-compose.yml           # One-command deployment
├── nginx.conf                   # Production Nginx configuration
├── vite.config.js               # Vite build configuration
├── tailwind.config.js           # Tailwind CSS theming
└── playwright.config.js         # E2E test configuration
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | React 18 with Hooks |
| **Build Tool** | Vite 6.1 |
| **Routing** | React Router 6 |
| **State Management** | React Query 5 (TanStack Query) |
| **UI Components** | Radix UI + shadcn/ui (44 primitives) |
| **Styling** | Tailwind CSS 3.4 |
| **Forms** | React Hook Form + Zod validation |
| **Charts** | Recharts 2 |
| **Maps** | Leaflet + React-Leaflet |
| **Icons** | Lucide React |
| **Theming** | next-themes (dark/light/system) |
| **Error Tracking** | Sentry |
| **Testing** | Vitest + React Testing Library + Playwright |
| **CI/CD** | GitHub Actions |
| **Deployment** | Docker + Nginx |

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** ≥ 20
- **npm** ≥ 10

### Installation

```bash
# Clone the repository
git clone https://github.com/dylanpersonguy/dccscan_new_frontend.git
cd dccscan_new_frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be running at **http://localhost:5173**.

### Environment Variables

Copy the example environment file and configure as needed:

```bash
cp .env.example .env
```

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_SENTRY_DSN` | Sentry DSN for error tracking | No |

---

## 📦 Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Auto-fix lint issues |
| `npm run typecheck` | Run TypeScript type checking |
| `npm test` | Run unit tests in watch mode |
| `npm run test:run` | Run unit tests once |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run test:e2e` | Run Playwright E2E tests |

---

## 🐳 Deployment

### Docker (Recommended)

```bash
# Build and start with Docker Compose
docker compose up -d

# The app is now available at http://localhost:3000
```

### Manual Build

```bash
# Build for production
npm run build

# Serve the dist/ directory with any static file server
npx serve dist
```

### Nginx

An optimized [nginx.conf](nginx.conf) is included for production deployments with:
- Gzip compression
- Static asset caching
- SPA history fallback
- Security headers

---

## 🧪 Testing

```bash
# Unit tests (watch mode)
npm test

# Unit tests (single run)
npm run test:run

# Unit tests with coverage
npm run test:coverage

# E2E tests (requires dev server running)
npm run test:e2e
```

### Test Coverage

| Area | Tests |
|------|-------|
| **ErrorBoundary** | Error display, recovery, fallback UI |
| **ProtectedRoute** | Auth guards, admin role enforcement, redirects |
| **LanguageContext** | i18n switching, translation keys, persistence |
| **Error Logger** | Error formatting, Sentry integration, rate limiting |
| **Utilities** | Class name merging, helper functions |
| **E2E** | Full user flows — login, navigation, search |

---

## 🌍 Internationalization

DecentralScan ships with English and Spanish translations. Adding a new language is straightforward:

1. Add your translations to `src/components/contexts/LanguageContext.jsx`
2. Add the language option to the language switcher in `Layout.jsx`

The language selection persists across sessions via localStorage.

---

## 🎨 Theming

The app supports **light**, **dark**, and **system** themes powered by `next-themes` and Tailwind CSS:

- Theme toggle is available in the top navigation bar
- Colors are defined as HSL CSS variables in `tailwind.config.js`
- All 44+ Radix UI components automatically adapt to the active theme

---

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) and [Code of Conduct](CODE_OF_CONDUCT.md) before submitting a pull request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feat/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feat/amazing-feature`)
5. Open a Pull Request

---

## 🔒 Security

If you discover a security vulnerability, please review our [Security Policy](SECURITY.md) for responsible disclosure guidelines.

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [Radix UI](https://www.radix-ui.com/) — Accessible, unstyled UI primitives
- [shadcn/ui](https://ui.shadcn.com/) — Beautiful component patterns
- [Tailwind CSS](https://tailwindcss.com/) — Utility-first CSS framework
- [Vite](https://vitejs.dev/) — Next-generation frontend tooling
- [React Query](https://tanstack.com/query) — Powerful async state management
- [Recharts](https://recharts.org/) — Composable React charting library
- [Leaflet](https://leafletjs.com/) — Interactive map library

---

<p align="center">
  Built with ❤️ for the DecentralChain community
</p>
