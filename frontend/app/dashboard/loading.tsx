export default function DashboardLoading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <div className="relative">
        <div className="h-12 w-12 rounded-full border-t-2 border-b-2 border-blue-600 animate-spin"></div>
        <div className="absolute top-0 left-0 h-12 w-12 rounded-full border-t-2 border-b-2 border-blue-200 opacity-20"></div>
      </div>
      <p className="mt-4 text-zinc-500 font-medium animate-pulse">Memuat halaman...</p>
    </div>
  );
}
