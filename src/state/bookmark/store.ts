import { versionedStoreBuilder } from "@/utils/storage";

export const BookmarkStore = versionedStoreBuilder()
  .setKey("mw-bookmarks")
  .addVersion({
    version: 0,
  })
  .addVersion({
    version: 1,
    migrate() {
      return {
        bookmarks: [],
      };
    },
    create() {
      return {
        bookmarks: [],
      };
    },
  })
  .build();
