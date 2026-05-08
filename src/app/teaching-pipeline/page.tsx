import type { Metadata } from "next";

import TeachingPipelinePreview from "@/components/teaching-pipeline-preview";

export const metadata: Metadata = {
  title: "Teaching Pipeline Preview - Chinese Mission",
  description: "Interactive preview of the animated Chinese teaching short-video pipeline.",
};

export default function TeachingPipelinePage() {
  return <TeachingPipelinePreview />;
}
