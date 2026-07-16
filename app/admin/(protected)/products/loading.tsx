import LoadingTable from "@/components/admin/ui/LoadingTable";

export default function ProductsLoading() {
  return (
    <div className="mx-auto max-w-[1600px]">
      <div className="animate-pulse">
        <div className="h-4 w-40 rounded bg-slate-200" />
        <div className="mt-4 h-10 w-56 rounded bg-slate-200" />
        <div className="mt-3 h-5 w-full max-w-2xl rounded bg-slate-200" />
      </div>

      <div className="mt-8">
        <LoadingTable rows={10} columns={7} />
      </div>
    </div>
  );
}