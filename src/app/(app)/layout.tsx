import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { allowedHrefs } from "@/components/shell/nav";
import { Sidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";
import { CommandPalette } from "@/components/shell/command-palette";
import { getNotifications } from "@/features/notifications/queries";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const allowed = allowedHrefs(new Set(user.grants.map((g) => g.key)));
  const notifications = await getNotifications(user);

  return (
    <div className="flex min-h-screen">
      <Sidebar allowed={allowed} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          userName={user.name}
          roleName={user.roleName ?? ""}
          notifications={notifications.items}
          unread={notifications.unread}
        />
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
      <CommandPalette allowed={allowed} />
    </div>
  );
}
