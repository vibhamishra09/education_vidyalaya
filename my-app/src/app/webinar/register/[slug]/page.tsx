import { WebinarRegisterClient } from "./webinar-register-client";

export default async function WebinarRegisterPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <WebinarRegisterClient slug={slug} />;
}