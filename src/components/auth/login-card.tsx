import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface LoginCardProps {
  error?: string | null;
  onGoogleLogin: () => void;
  onBypassLogin?: () => void;
  isStaging?: boolean;
}

export function LoginCard({ error, onGoogleLogin, onBypassLogin, isStaging }: LoginCardProps) {
  return (
    <div className="min-h-screen bg-[#f5f5f7] dark:bg-zinc-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decorative Blur Orbs */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-blue-400/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-purple-400/10 blur-[120px] pointer-events-none" />

      <Card className="w-full max-w-md bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-white/50 dark:border-zinc-800/50 rounded-3xl shadow-[0_24px_50px_rgba(0,0,0,0.06)] p-8 md:p-10 relative z-10 transition-all duration-300">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#0071e3]/10 text-[#0071e3] rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-[0_8px_20px_rgba(0,113,227,0.15)]">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-[#1d1d1f] dark:text-white text-balance">
            All-Platform-Post
          </h1>
          <p className="text-[#86868b] dark:text-zinc-400 mt-2.5 text-sm font-medium">
            Seamless multi-platform social media publishing
          </p>
        </div>

        <CardContent className="p-0 space-y-4">
          {error && (
            <Alert variant="destructive" className="bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400 rounded-xl">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="font-semibold text-xs">{error}</AlertDescription>
            </Alert>
          )}
          <Button
            variant="outline"
            className="w-full gap-3.5 py-6 border-zinc-200 dark:border-zinc-800 rounded-full shadow-[0_1px_2px_rgba(0,0,0,0.05)] bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700/80 active:scale-[0.98] transition-all duration-200"
            onClick={onGoogleLogin}
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            <span className="text-zinc-750 dark:text-zinc-200 font-semibold text-sm">Sign in with Google</span>
          </Button>

          {isStaging && (
            <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
              <Button
                variant="secondary"
                type="button"
                className="w-full py-5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-[0.98] transition-all duration-200"
                onClick={onBypassLogin}
              >
                <span className="font-semibold text-xs text-yellow-600 dark:text-yellow-500">
                  ⚠️ Staging Bypass Login (Test Account)
                </span>
              </Button>
            </div>
          )}
        </CardContent>

        <div className="mt-8 text-center">
          <p className="text-[12px] text-[#86868b] dark:text-zinc-500 font-medium">
            By signing in, you agree to our terms and privacy policy.
          </p>
        </div>
      </Card>
    </div>
  );
}
