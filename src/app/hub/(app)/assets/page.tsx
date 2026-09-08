import { AssetUploader } from "@/components/hub/AssetUploader";
import { createClient } from "@/lib/supabase/server";

export default async function AssetsPage() {
  const supabase = await createClient();
  const { data: assets } = await supabase
    .from("assets")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-white">Assets</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Storage buckets: assets, email-images, ai-posters.
        </p>
      </div>
      <AssetUploader />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(assets ?? []).map((asset) => (
          <figure
            key={asset.id}
            className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/40"
          >
            {asset.mime_type?.startsWith("image/") && asset.public_url ? (
              <img
                src={asset.public_url}
                alt={asset.filename ?? "Asset"}
                className="h-40 w-full object-cover"
              />
            ) : (
              <div className="flex h-40 items-center justify-center text-sm text-zinc-500">
                {asset.filename}
              </div>
            )}
            <figcaption className="space-y-1 p-3 text-xs text-zinc-400">
              <p className="truncate text-zinc-200">{asset.filename}</p>
              <p>{asset.bucket}</p>
              {asset.public_url ? (
                <a
                  href={asset.public_url}
                  className="text-indigo-400 hover:text-indigo-300"
                  target="_blank"
                  rel="noreferrer"
                >
                  Open
                </a>
              ) : null}
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
