# Templio

**Save, Edit & Preview HTML Templates in the Cloud**

A modern, responsive web application for saving and previewing HTML templates with automatic screenshot generation. Your templates are saved in the cloud and accessible from any device.

## Features

- 📝 **Save HTML Snippets**: Add HTML code with title and description
- 🖼️ **Automatic Screenshots**: Automatically generates screenshots of your HTML
- 🎴 **Card View**: Beautiful card-based display of all saved snippets
- 👁️ **Split Screen Preview**: View code and live preview side-by-side
- 📱 **Mobile Responsive**: Fully responsive design for all devices
- ☁️ **Cloud Storage**: All data saved securely in the cloud with Supabase
- 🔐 **Authentication**: Secure user accounts with email/password

## Getting Started

### Prerequisites

- Node.js 16+ and npm/pnpm

### Installation

1. Install dependencies:
```bash
pnpm install
```

2. Start the development server:
```bash
pnpm dev
```

3. Open your browser and navigate to `http://localhost:5173`

## Usage

1. Click "Add Snippet" to create a new HTML snippet
2. Fill in the title, description (optional), and paste your HTML code
3. The app will automatically generate a screenshot when you save
4. Click on any card to view the snippet in detail with split-screen preview
5. Use the copy button to copy the HTML code
6. Delete snippets using the delete button

## Build for Production

```bash
pnpm build
```

The built files will be in the `dist` directory.

## Tech Stack

- React 18
- Vite
- Supabase (cloud database & authentication)
- html2canvas (for screenshot generation)
- Lucide React (icons)
- CSS3 (modern dark theme with ONYX design system)

