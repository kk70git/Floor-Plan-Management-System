# 🏢 Intelligent Floor Plan Management System

## Project Overview

This is a modern, full-stack application built with **Next.js** and **MongoDB** designed to optimize workspace usage. It features a robust, smart booking engine that recommends the best meeting rooms or hot desks based on capacity, proximity (3D distance), and historical user preference.

The project incorporates several architectural "Plus Points" including OOP principles, a fault-tolerant offline mode for administrators, comprehensive caching, and advanced input validation.

## ✨ Key Features & Technical Highlights

### Smart Booking & Optimization
* **Intelligent Scoring:** Rooms are ranked using a **Positive Match Score** based on the formula: `1000 - Distance (3D) + (Usage Count * 10)`.
* **3D Distance Calculation:** Proximity is calculated using `x`, `y`, and `floorNumber` (vertical penalty) to provide realistic walk/commute times.
* **User Preferences:** The system automatically prioritizes rooms the user has booked most frequently.
* **Dynamic Filtering:** Users can filter available slots by date/time, participants, and floor number.

### 🔐 Security & Data Integrity
* **Robust Authentication:** Uses JWT (JSON Web Tokens) for session management and `bcryptjs` for secure password hashing.
* **Strict Input Validation (Zod):** Implemented on **all** API routes (Login, Signup, Booking, Admin) to prevent invalid data from reaching the server (email format, minimum password length (8), floor constraints).
* **Role-Based Access Control (RBAC):** Access to Admin and Monitoring pages is restricted by user role.
* **Privilege Escalation Guard:** Admins/Super Admins require a specific **Secret Key** during signup, preventing unauthorized access to privileged roles.

### ⚙️ Admin Management & Performance
* **Fault-Tolerant Offline Mode:** Administrators can make floor plan updates when offline. Changes are saved to `localStorage` and automatically synchronized upon re-establishing connection (`hooks/useOfflineSync.js`).
* **Concurrency Control:** Implements a basic **version control** mechanism to detect and prevent conflicts during simultaneous updates by multiple administrators.
* **System Monitoring:** The `withMonitor.js` middleware tracks and logs the duration, path, and status of every API request, viewable on the Admin Monitoring dashboard.
* **Caching (`lib/cache.js`):** Implements a **Time-To-Live (TTL)** caching strategy on read-heavy APIs to drastically reduce database load and enhance system response times.

### 💻 Architectural Implementation
* **Object-Oriented Programming (OOP):** The complex scoring logic is encapsulated within a dedicated `RecommendationEngine` class (`services/RecommendationEngine.js`), demonstrating structured, modular code and fulfilling the OOP evaluation criteria.

## 🚀 Getting Started

### Prerequisites

You need Node.js and a MongoDB instance (local or Atlas).

1.  **Node.js** (v18+)
2.  **npm** (comes with Node.js)

### Installation

Clone the repository and install dependencies:

```bash
# Clone your repository
git clone [YOUR_REPO_URL]
cd your-project-name

# Install main packages
npm install

# Install Tailwind and dev dependencies
npm install -D tailwindcss postcss autoprefixer
npm install zod lucide-react next react react-dom
