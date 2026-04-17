export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center p-8 text-center bg-gray-50 dark:bg-slate-900/50">
      <div className="max-w-2xl bg-white dark:bg-slate-800 p-12 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-700">
        <h1 className="text-4xl font-extrabold text-primary mb-4 tracking-tight">
          Welcome to AAST<span className="text-secondary">Sys</span>
        </h1>
        <p className="text-xl text-slate-600 dark:text-slate-300 mb-8 max-w-lg mx-auto">
          The official gateway for managing university resources, bookings, and operations at the Arab Academy for Science, Technology & Maritime Transport.
        </p>
        <div className="flex justify-center">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700/50 py-2 px-4 rounded-full">
            Please log in to access your dashboard.
          </p>
        </div>
      </div>
    </div>
  );
}
