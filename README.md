# 🛒 SoniCart E-Commerce Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Backend-Node.js-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/Frontend-React-blue.svg)](https://react.dev/)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-blue.svg)](https://www.postgresql.org/)
[![Stripe](https://img.shields.io/badge/Payments-Stripe-blueviolet.svg)](https://stripe.com/)

---

## 🚀 Overview

**SoniCart** is a modern, full-stack e-commerce platform built for scalability, performance, and a seamless user experience. It features a robust backend with Node.js/Express and PostgreSQL, and a beautiful, responsive frontend with React and Tailwind CSS. SoniCart is designed for real-world commerce, supporting secure payments, user authentication, admin dashboards, product management, and more.

---

## ✨ Features

- **Modern UI/UX:** Responsive design with Tailwind CSS and Framer Motion animations
- **Secure Payments:** Stripe integration for real transactions
- **User Authentication:** JWT-based, with protected/admin routes
- **Product Management:** Full CRUD for products, categories, and reviews
- **Shopping Cart:** Persistent cart, checkout, and order management
- **Admin Dashboard:** Manage products, orders, users, analytics
- **Order Tracking:** Real-time updates and status management
- **Product Reviews:** Add, edit, and delete reviews
- **Profile Management:** Edit info, change password, manage addresses
- **Transactional Emails:** Order confirmation, password reset, etc.
- **Accessibility & SEO:** Semantic HTML, ARIA, meta tags, mobile-friendly
- **Testing:** Backend and frontend test coverage
- **Returns & Exchanges:** Initiate and manage product returns/exchanges

---

## 🏗️ Tech Stack

| Layer      | Technology                |
|------------|---------------------------|
| Frontend   | React, Tailwind CSS       |
| Backend    | Node.js, Express          |
| Database   | PostgreSQL, Prisma ORM    |
| Auth       | JWT, bcrypt               |
| Payments   | Stripe                    |
| Testing    | Jest, React Testing Library |
| Dev Tools  | ESLint, Prettier, Husky   |

---

## 📦 Project Structure

```
sonicart/
├── backend/         # Node.js/Express API
│   ├── prisma/      # Prisma schema & migrations
│   ├── routes/      # API endpoints
│   ├── middleware/  # Auth, error handling, security
│   └── utils/       # Utility functions
├── frontend/        # React app
│   ├── src/         # Source code
│   ├── public/      # Static assets
│   └── ...          
└── README.md
```

---

## ⚡ Quickstart

### 1. Clone the Repository

```bash
git clone https://github.com/lakshya189/SoniCart-E-Commerce-platform.git
cd SoniCart-E-Commerce-platform
```

### 2. Install Dependencies

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 3. Set Up Environment Variables

Copy the example env files and fill in your credentials:

```bash
cp backend/env.example backend/.env
cp frontend/env.example frontend/.env
```

### 4. Set Up the Database

```bash
cd backend
npx prisma migrate deploy
npx prisma db seed
```

### 5. Start the Development Servers

```bash
# In backend/
npm run dev

# In frontend/ (separate terminal)
npm start
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- Admin Dashboard: http://localhost:3000/admin

---

## 📝 API Endpoints

### Authentication
- `POST /api/auth/register` — Register new user
- `POST /api/auth/login` — Login user
- `GET /api/auth/me` — Get current user
- `POST /api/auth/forgot-password` — Request password reset
- `POST /api/auth/reset-password` — Reset password

### Products
- `GET /api/products` — List products
- `POST /api/products` — Create product (admin)
- `PUT /api/products/:id` — Update product (admin)
- `DELETE /api/products/:id` — Delete product (admin)
- `POST /api/products/:id/reviews` — Add review

### Orders
- `GET /api/orders` — Get user orders
- `POST /api/orders` — Create order
- `GET /api/orders/:id` — Order details

### Payments
- `POST /api/payments/create-payment-intent` — Stripe payment intent

### Cart
- `GET /api/cart` — Get cart
- `POST /api/cart` — Add to cart

### Returns & Exchanges
- `GET /api/returns` — List returns
- `POST /api/returns` — Initiate return

---

## 👩‍💻 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

All contributions are welcome! Please read the [contributing guidelines](CONTRIBUTING.md) if available.

---

## 🛡️ Security

- Never commit secrets or credentials.
- Use environment variables for sensitive data.
- Rotate secrets if accidentally exposed.

---

## 📄 License

This project is licensed under the MIT License.

---

## 🙏 Acknowledgements

- [React](https://react.dev/)
- [Node.js](https://nodejs.org/)
- [PostgreSQL](https://www.postgresql.org/)
- [Stripe](https://stripe.com/)
- [Prisma](https://www.prisma.io/)
- [Tailwind CSS](https://tailwindcss.com/)

---

> **SoniCart** — The ultimate open-source e-commerce platform for modern web! 