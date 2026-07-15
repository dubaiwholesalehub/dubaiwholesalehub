import LoadingTable from "@/components/admin/ui/LoadingTable";

export default function BrandsLoading() {
  return (
    <div className="mx-auto max-w-7xl">
      <div className="animate-pulse">
        <div className="h-4 w-40 rounded bg-slate-200" />
        <div className="mt-4 h-10 w-56 rounded bg-slate-200" />
        <div className="mt-3 h-5 w-full max-w-xl rounded bg-slate-200" />
      </div>

      <div className="mt-8">
        <LoadingTable rows={8} columns={6} />
      </div>
    </div>
  );
}