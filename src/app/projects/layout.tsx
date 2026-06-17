import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Project Tracker | Zitron Web Design",
  description: "Track web design projects, payments, and client communication.",
};

export default function ProjectsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
