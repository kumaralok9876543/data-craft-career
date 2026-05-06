import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import appCss from "../styles.css?url";
import { AuthProvider } from "@/lib/auth";
import { Navbar } from "@/components/Navbar";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "DataEng Jobs — AI-Powered Data Engineering Career Assistant" },
      { name: "description", content: "Find Data Engineering jobs in India, analyze your resume with AI, get personalized study plans and job recommendations." },
      { property: "og:title", content: "DataEng Jobs — AI-Powered Data Engineering Career Assistant" },
      { name: "twitter:title", content: "DataEng Jobs — AI-Powered Data Engineering Career Assistant" },
      { property: "og:description", content: "Find Data Engineering jobs in India, analyze your resume with AI, get personalized study plans and job recommendations." },
      { name: "twitter:description", content: "Find Data Engineering jobs in India, analyze your resume with AI, get personalized study plans and job recommendations." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/fe778839-4906-4eb5-a095-a363f347f4a5/id-preview-98ac957f--cb4b58d6-a9ba-402b-959c-1b77115f4d06.lovable.app-1778066374057.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/fe778839-4906-4eb5-a095-a363f347f4a5/id-preview-98ac957f--cb4b58d6-a9ba-402b-959c-1b77115f4d06.lovable.app-1778066374057.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body style={{ fontFamily: "'Inter', sans-serif" }}>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <AuthProvider>
      <Navbar />
      <Outlet />
      <Toaster />
    </AuthProvider>
  );
}
