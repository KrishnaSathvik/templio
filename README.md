# Templio

**Save, Edit & Preview HTML Templates in the Cloud**

A modern, production-ready web application for saving and previewing HTML templates with automatic screenshot generation. Your templates are saved securely in the cloud and accessible from any device.

![Production Ready](https://img.shields.io/badge/status-production%20ready-brightgreen)
![React](https://img.shields.io/badge/React-18.2-blue)
![Vite](https://img.shields.io/badge/Vite-5.0-purple)
![Supabase](https://img.shields.io/badge/Supabase-2.39-green)

## ✨ Features

### Core Features
- 📝 **Save HTML Templates**: Add HTML code with title and description
- 🖼️ **Automatic Screenshots**: Automatically generates screenshots of your HTML templates
- 🔎 **Global Search**: Search templates by title, description, and HTML content
- 🏷️ **Tags & Collections**: Organize and filter templates by tags and collections
- 🔗 **Shareable Read-Only Links**: Create public read-only links for individual templates
- 📊 **Snippet Analytics**: Track views/copies/shares and activity summary
- 🎴 **Beautiful Card View**: Card-based display with screenshot previews
- 👁️ **Live Preview**: View code and live preview in full-screen mode
- ⭐ **Favorites**: Mark templates as favorites for quick access
- 🔍 **Filtering & Sorting**: Filter by favorites, sort by newest/oldest
- 📄 **Pagination**: Navigate through your templates with pagination (6 per page)
- ✏️ **Edit Title**: Edit template titles inline (title only, not HTML code)
- 📋 **Copy Code**: One-click copy HTML code to clipboard
- 🗑️ **Delete Templates**: Delete templates with confirmation

### User Experience
- 🎨 **Dark/Light Theme**: Beautiful theme switcher with system preference detection
- 📱 **Fully Responsive**: Works perfectly on mobile, tablet, and desktop
- ⚡ **Fast Loading**: Optimized with code splitting and caching
- 🔔 **Toast Notifications**: Beautiful, non-intrusive notifications for all actions
- ⏳ **Loading States**: Visual feedback for all operations
- 🛡️ **Error Handling**: Comprehensive error boundary and user-friendly error messages

### Security & Production
- 🔒 **HTTPS Enforcement**: Automatic HTTPS redirect in production
- 🧹 **Input Sanitization**: XSS protection with DOMPurify
- 🛡️ **Safe Preview Mode**: Sanitized preview by default with optional JS execution toggle
- ✅ **Input Validation**: Comprehensive validation for all inputs
- 🔐 **Secure Authentication**: Email/password authentication via Supabase
- 🤖 **Server-Side AI Assist**: AI metadata suggestions via secure backend endpoint
- ☁️ **Cloud Storage**: All data saved securely in Supabase
- 🚫 **Production-Safe Logging**: No console.logs in production builds

## 🚀 Quick Start

### Prerequisites

- Node.js 16+ (18+ recommended)
- pnpm (or npm/yarn)

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/KrishnaSathvik/templio.git
   cd templio
   ```

2. **Install dependencies**:
   ```bash
   pnpm install
   ```

3. **Set up environment variables**:
   
   Create a `.env` file in the root directory:
   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```
   
   See [ENV_SETUP.md](./ENV_SETUP.md) for detailed instructions.

4. **Set up Supabase**:
   
   Follow the instructions in [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) to:
   - Create a Supabase project
   - Set up tables, policies, and indexes
   - Configure Row Level Security (RLS) policies

5. **Run migrations (one command)**:
   ```bash
   pnpm migrate
   ```

6. **Start the development server**:
   ```bash
   pnpm dev
   ```

7. **Open your browser**:
   Navigate to `http://localhost:5173`

## 📖 Usage

### Creating Templates

1. Click **"Add Template"** button in the header
2. Enter a title (required)
3. Add a description (optional)
4. Paste your HTML code
5. Click **"Save Template"** - screenshot will be generated automatically

### Managing Templates

- **View Template**: Click on any card to view in detail
- **Edit Title**: Click the edit icon next to the title in detail view (title only, HTML code is read-only)
- **Toggle Favorite**: Click the star icon on any card
- **Filter**: Use the filter dropdown to show favorites or sort by date
- **Copy Code**: Click the copy button in code view to copy HTML to clipboard
- **Delete**: Click the delete button (with confirmation)

### View Modes

- **Preview View**: Full-screen live preview of your HTML (default view)
- **Code View**: Read-only syntax-highlighted code viewer with line numbers

**Note**: HTML code and description cannot be edited after creation. You can only edit the title. To modify HTML, delete and recreate the template.

## 🏗️ Build for Production

```bash
pnpm build
```

The optimized production build will be in the `dist` directory.

### Preview Production Build

```bash
pnpm preview
```

## 🚢 Deployment

### Deploy to Vercel (Recommended)

This app is optimized for Vercel deployment. See [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md) for complete deployment instructions.

**Quick Deploy**:
1. Push your code to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Add environment variables in Vercel dashboard
4. Deploy!

### Environment Variables for Production

Make sure to set these in your hosting platform:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## 🛠️ Tech Stack

### Frontend
- **React 18** - UI library
- **Vite 5** - Build tool and dev server
- **Lucide React** - Icon library
- **Prism.js** - Syntax highlighting
- **react-simple-code-editor** - Code editor component

### Backend & Services
- **Supabase** - Database, authentication, and cloud storage
- **Vercel API Route** - Secure server endpoint for AI assist
- **html2canvas** - Screenshot generation
- **isomorphic-dompurify** - HTML sanitization

### Styling
- **CSS3** - Custom styling with modern design
- **CSS Variables** - Theme system
- **Responsive Design** - Mobile-first approach

## 📁 Project Structure

```
templio/
├── public/                 # Static assets
├── src/
│   ├── components/        # React components
│   │   ├── AddSnippetForm.jsx
│   │   ├── Auth.jsx
│   │   ├── ErrorBoundary.jsx
│   │   ├── SnippetCard.jsx
│   │   ├── SnippetDetail.jsx
│   │   ├── Toast.jsx
│   │   └── ...
│   ├── contexts/          # React contexts
│   │   ├── ThemeContext.jsx
│   │   └── ToastContext.jsx
│   ├── lib/               # External libraries
│   │   └── supabase.js
│   ├── services/          # API services
│   │   └── snippetsService.js
│   ├── utils/             # Utility functions
│   │   ├── httpsEnforcement.js
│   │   ├── imageProxy.js
│   │   ├── logger.js
│   │   └── validation.js
│   ├── App.jsx            # Main app component
│   └── main.jsx           # Entry point
├── .env                   # Environment variables (not in git)
├── package.json
├── vite.config.js
└── README.md
```

## 🔒 Security Features

- ✅ **HTTPS Enforcement** - Automatic redirect in production
- ✅ **Input Sanitization** - XSS protection with DOMPurify
- ✅ **Input Validation** - Comprehensive validation
- ✅ **Secure Authentication** - Supabase Auth with RLS
- ✅ **Error Boundary** - Prevents app crashes
- ✅ **Production-Safe Logging** - No sensitive data in logs

## 📚 Documentation

- [Environment Setup](./ENV_SETUP.md) - Setting up environment variables
- [Supabase Setup](./SUPABASE_SETUP.md) - Database and authentication setup
- [Vercel Deployment](./VERCEL_DEPLOYMENT.md) - Production deployment guide
- [Production Readiness Report](./PRODUCTION_READINESS_REPORT.md) - Detailed analysis
- [Critical Fixes Summary](./CRITICAL_FIXES_SUMMARY.md) - What's been fixed

## 🎯 Features Roadmap

### Completed ✅
- Toast notification system
- Error boundary
- Input validation & sanitization
- HTTPS enforcement
- Theme switcher (dark/light/system)
- Favorites system
- Filtering & sorting (newest/oldest/favorites)
- Pagination (6 items per page)
- Loading states for all operations
- Title editing (inline)
- Production optimizations
- Code splitting
- LocalStorage caching

### Planned 🚧
- Full template editing (HTML code and description)
- Search functionality
- Tags/categories
- Export/Import
- Version history
- Sharing capabilities
- Bulk operations

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

This project is private and proprietary.

## 🙏 Acknowledgments

- Built with [React](https://react.dev/)
- Powered by [Supabase](https://supabase.com/)
- Icons by [Lucide](https://lucide.dev/)
- Screenshots by [html2canvas](https://html2canvas.hertzen.com/)

## 📧 Support

For issues and questions, please open an issue on GitHub.

---

**Made with ❤️ for developers who love beautiful HTML templates**
