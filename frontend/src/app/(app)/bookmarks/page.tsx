import { HomeFeed } from "@/components/home-feed";

export default function BookmarksPage() {
  return (
    <div>
      <div className="sticky top-14 z-10 border-b bg-background/90 px-4 py-3 backdrop-blur md:top-0">
        <h1 className="text-lg font-semibold">Bookmarks</h1>
      </div>
      <HomeFeed mode="bookmarks" />
    </div>
  );
}
