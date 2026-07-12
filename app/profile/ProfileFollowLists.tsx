import Link from "next/link";
import UserImage from "@/components/UserImage";

export type ProfileFollowListItem = {
  userId: string;
  displayName: string;
  userName: string;
  avatarUrl: string;
  href: string;
};

function FollowList({ title, items }: { title: string; items: ProfileFollowListItem[] }) {
  return (
    <details className="border-t border-slate-200 py-3">
      <summary className="flex min-h-10 cursor-pointer items-center justify-between gap-3 text-sm font-black text-slate-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#dc115e]/15">
        {title}<span className="text-slate-500">{items.length}</span>
      </summary>
      {items.length > 0 ? (
        <ul className="mt-2 divide-y divide-slate-200">
          {items.map((item) => (
            <li key={item.userId} className="py-2">
              {item.href ? (
                <Link href={item.href} className="flex min-h-11 items-center gap-3 rounded-lg px-1 transition hover:text-[#dc115e] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#dc115e]/15">
                  <FollowIdentity item={item} />
                </Link>
              ) : <div className="flex min-h-11 items-center gap-3 px-1"><FollowIdentity item={item} /></div>}
            </li>
          ))}
        </ul>
      ) : <p className="py-3 text-sm text-slate-500">No members to show.</p>}
    </details>
  );
}

function FollowIdentity({ item }: { item: ProfileFollowListItem }) {
  return <><span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#dc115e] text-xs font-black text-white">{item.avatarUrl ? <UserImage src={item.avatarUrl} alt="" width={36} height={36} className="h-full w-full object-cover" /> : item.displayName.slice(0, 2).toUpperCase()}</span><span className="min-w-0"><span className="block truncate text-sm font-bold">{item.displayName}</span><span className="block truncate text-xs font-semibold text-slate-500">@{item.userName}</span></span></>;
}

export default function ProfileFollowLists({ followers, following }: { followers: ProfileFollowListItem[]; following: ProfileFollowListItem[] }) {
  return <section aria-label="Follow relationships" className="mx-auto grid w-full max-w-2xl gap-x-8 px-1 sm:grid-cols-2"><FollowList title="Followers" items={followers} /><FollowList title="Following" items={following} /></section>;
}
