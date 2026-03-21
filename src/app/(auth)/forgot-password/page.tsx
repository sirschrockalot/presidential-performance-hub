import Link from "next/link";

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted p-6">
      <div className="max-w-md w-full rounded-lg border bg-card p-6 shadow-sm space-y-4">
        <h1 className="text-xl font-bold tracking-tight">Reset your password</h1>
        <p className="text-sm text-muted-foreground">
          If you are already signed in, open <strong>Settings</strong> → <strong>Security</strong> and use{" "}
          <strong>Change password</strong>. You will need your current password.
        </p>
        <p className="text-sm text-muted-foreground">
          If you cannot sign in, an <strong>administrator</strong> can set a new password for your account from{" "}
          <strong>Team</strong> → edit member → <strong>Set password</strong>.
        </p>
        <p className="text-sm text-muted-foreground">
          This app does not send password reset emails yet; contact your admin if you are locked out.
        </p>
        <Link href="/login" className="text-sm font-medium text-primary underline-offset-4 hover:underline inline-block">
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
