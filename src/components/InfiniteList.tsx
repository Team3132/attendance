import { List, type ListProps } from "@mui/material";
import type { InfiniteData } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef } from "react";

type OmittedListProps = Omit<ListProps, "children" | "ref" | "component">;

type PagedType<T> = {
  items: T[];
  total: number;
  nextCursor?: string | null | undefined;
};

interface RenderRowProps<T> {
  row: T;
  style: React.CSSProperties;
  ref: (node: Element | null) => void;
  index: number;
}

interface InfiniteListParams<T, IPaged extends PagedType<T> = PagedType<T>> {
  data?: InfiniteData<IPaged, number | null | undefined | unknown>;
  fetchNextPage: () => void;
  isFetching: boolean;
  fixedHeight?: number;
  scrollRestorationId?: string;
  renderRow: (row: RenderRowProps<T>) => React.ReactNode;
}

interface InfiniteListProps<T, IPaged extends PagedType<T> = PagedType<T>>
  extends InfiniteListParams<T, IPaged>,
    OmittedListProps {}

export default function InfiniteList<T>(props: InfiniteListProps<T>) {
  const {
    data,
    fetchNextPage,
    isFetching,
    fixedHeight,
    renderRow,
    scrollRestorationId = "infinite-list",
    ...listProps
  } = props;

  const total = useMemo(() => data?.pages.at(-1)?.total ?? 0, [data?.pages]);

  const currentTotal = useMemo(
    () => data?.pages?.reduce((acc, page) => acc + page.items.length, 0) ?? 0,
    [data?.pages],
  );

  const flatData = useMemo(
    () => data?.pages?.flatMap((page) => page.items) ?? [],
    [data?.pages],
  );

  // const scrollEntry = useElementScrollRestoration({
  //   id: scrollRestorationId,
  // });

  const tableContainerRef = useRef<HTMLUListElement>(null);

  const virtualizer = useVirtualizer({
    getScrollElement: () => tableContainerRef.current,
    count: currentTotal,
    estimateSize: () => fixedHeight || 48,
    overscan: 10,
    // initialOffset: scrollEntry?.scrollY,
  });

  const fetchMoreOnBottomReached = useCallback(
    (containerRefElement?: HTMLUListElement | null) => {
      if (containerRefElement && fetchNextPage && total !== undefined) {
        const { scrollHeight, scrollTop, clientHeight } = containerRefElement;
        //once the user has scrolled within 300px of the bottom of the table, fetch more data if there is any
        if (
          scrollHeight - scrollTop - clientHeight < 300 &&
          !isFetching &&
          currentTotal < total
        ) {
          fetchNextPage();
        }
      }
    },
    [fetchNextPage, isFetching, currentTotal, total],
  );

  useEffect(() => {
    fetchMoreOnBottomReached(tableContainerRef.current);
  }, [fetchMoreOnBottomReached]);

  return (
    <List
      component={"ul"}
      {...listProps}
      ref={tableContainerRef}
      data-scroll-restoration-id={scrollRestorationId}
      onScroll={(e) => {
        fetchMoreOnBottomReached(e.target as HTMLUListElement);
      }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          position: "relative",
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const item = flatData[virtualItem.index] as T;

          const newStyle: React.CSSProperties = {
            transform: `translateY(${virtualItem.start}px)`,
            position: "absolute",
            width: "100%",
          };

          return renderRow({
            index: virtualItem.index,
            row: item,
            style: newStyle,
            ref: (node) => virtualizer.measureElement(node),
          });
        })}
      </div>
    </List>
  );
}
