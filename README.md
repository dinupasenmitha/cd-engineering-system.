# CD Engineering Management System v3.0

Professional Air Conditioning Business Management System (ERP).

## Features
- **Dashboard**: Real-time business KPIs and revenue charts.
- **Job Management**: Track installations, repairs, and maintenance.
- **Fleet & Catalog**: Manage lorries, technicians, and service/parts pricing.
- **Invoicing & Quotations**: Professional financial document generation.
- **User Roles**: Admin and Staff access levels.
- **Backup System**: Automated and manual data backups.

## Tech Stack
- **Backend**: Node.js, Express
- **Database**: SQLite (via `sql.js`)
- **Frontend**: Vanilla JS, HTML5, CSS3 (Modern UI)

## Deployment Instructions

### 1. Push to GitHub
1. Create a new repository on GitHub named `cd-engineering-system`.
2. Run the following commands in your terminal:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/cd-engineering-system.git
   git branch -M main
   git push -u origin main
   ```

### 2. Live Server (Render.com)
1. Sign up/Login to [Render](https://render.com).
2. Click **New +** and select **Web Service**.
3. Connect your GitHub repository.
4. Use the following settings:
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Render will automatically deploy your app and provide a live URL.

*Note: Since this app uses a local SQLite file, data will reset if the server restarts on free hosting tiers. For persistent data, consider adding a persistent disk on Render or using a cloud database.*
