import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ channelId: string }>;
}): Promise<Metadata> {
  await params; // Channel ID not needed for metadata

  return {
    title: `Chat Channel | Webyalaya`,
    description: "Connect with peers through chat on Webyalaya. Message other learners and collaborate on your learning journey.",
    robots: {
      index: false, // Chat channels are private
      follow: false,
    },
  };
}

export default function ChatChannelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
