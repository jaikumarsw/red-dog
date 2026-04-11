export default function AdminSettingsPage() {
  return (
    <div className="max-w-xl space-y-4 text-slate-300">
      <h1 className="text-2xl font-bold text-white">Settings</h1>
      <p className="text-sm">
        Staff account preferences and platform configuration are managed outside this demo panel.
        Use environment variables on the server for OpenAI, SMTP, and database connection.
      </p>
    </div>
  );
}
