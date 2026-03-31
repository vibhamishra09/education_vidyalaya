import { getWebinarPublicMetadata } from "@/lib/server/fetch-webinar-public";
import { WebinarRegisterClient } from "./webinar-register-client";

export default async function WebinarRegisterPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const result = await getWebinarPublicMetadata(slug);
  return (
    <WebinarRegisterClient
      slug={slug}
      initialMeta={result.ok ? result.data : null}
    />
  );
}