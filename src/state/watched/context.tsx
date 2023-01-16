import { DetailedMeta } from "@/backend/metadata/getmeta";
import { MWMediaMeta } from "@/backend/metadata/types";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { VideoProgressStore } from "./store";

interface MediaItem {
  meta: MWMediaMeta;
  series?: {
    episode: number;
    season: number;
  };
}

interface WatchedStoreItem {
  item: MediaItem;
  progress: number;
  percentage: number;
}

export interface WatchedStoreData {
  items: WatchedStoreItem[];
}

interface WatchedStoreDataWrapper {
  updateProgress(media: MediaItem, progress: number, total: number): void;
  getFilteredWatched(): WatchedStoreItem[];
  watched: WatchedStoreData;
}

const WatchedContext = createContext<WatchedStoreDataWrapper>({
  updateProgress: () => {},
  getFilteredWatched: () => [],
  watched: {
    items: [],
  },
});
WatchedContext.displayName = "WatchedContext";

export function WatchedContextProvider(props: { children: ReactNode }) {
  const watchedLocalstorage = VideoProgressStore.get();
  const [watched, setWatchedReal] = useState<WatchedStoreData>(
    watchedLocalstorage as WatchedStoreData
  );

  const setWatched = useCallback(
    (data: any) => {
      setWatchedReal((old) => {
        let newData = data;
        if (data.constructor === Function) {
          newData = data(old);
        }
        watchedLocalstorage.save(newData);
        return newData;
      });
    },
    [setWatchedReal, watchedLocalstorage]
  );

  const contextValue = useMemo(
    () => ({
      updateProgress(media: MediaItem, progress: number, total: number): void {
        setWatched((data: WatchedStoreData) => {
          let item = data.items.find((v) => v.item.meta.id === media.meta.id);
          if (!item) {
            item = {
              item: {
                ...media,
                meta: { ...media.meta },
                series: media.series ? { ...media.series } : undefined,
              },
              progress: 0,
              percentage: 0,
            };
            data.items.push(item);
          }
          // update actual item
          item.progress = progress;
          item.percentage = Math.round((progress / total) * 100);
          return data;
        });
      },
      getFilteredWatched() {
        let filtered = watched.items;

        // get highest episode number for every anime/season
        const highestEpisode: Record<string, [number, number]> = {};
        const highestWatchedItem: Record<string, WatchedStoreItem> = {};
        filtered = filtered.filter((item) => {
          if (item.item.series) {
            const key = item.item.meta.id;
            const current: [number, number] = [
              item.item.series.episode,
              item.item.series.season,
            ];
            let existing = highestEpisode[key];
            if (!existing) {
              existing = current;
              highestEpisode[key] = current;
              highestWatchedItem[key] = item;
            }
            if (
              current[0] > existing[0] ||
              (current[0] === existing[0] && current[1] > existing[1])
            ) {
              highestEpisode[key] = current;
              highestWatchedItem[key] = item;
            }
            return false;
          }
          return true;
        });
        return [...filtered, ...Object.values(highestWatchedItem)];
      },
      watched,
    }),
    [watched, setWatched]
  );

  return (
    <WatchedContext.Provider value={contextValue as any}>
      {props.children}
    </WatchedContext.Provider>
  );
}

export function useWatchedContext() {
  return useContext(WatchedContext);
}

export function useWatchedItem(meta: DetailedMeta | null) {
  const { watched, updateProgress } = useContext(WatchedContext);
  const item = useMemo(
    () => watched.items.find((v) => meta && v.item.meta.id === meta?.meta.id),
    [watched, meta]
  );

  const callback = useCallback(
    (progress: number, total: number) => {
      if (meta) {
        // TODO add series support
        updateProgress({ meta: meta.meta }, progress, total);
      }
    },
    [updateProgress, meta]
  );

  return { updateProgress: callback, watchedItem: item };
}
