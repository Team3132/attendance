import Datatable from "@/components/Datatable";
import InfiniteDatatable from "@/components/InfiniteDatatable";
import { LinkButton } from "@/components/LinkButton";
import { usersQueryOptions } from "@/queries/users.queries";
import { Button, Skeleton, Stack, TextField } from "@mui/material";
import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { createFileRoute, stripSearchParams } from "@tanstack/react-router";
import { createColumnHelper } from "@tanstack/react-table";
import { Suspense, useMemo } from "react";
import { useCallback } from "react";
import { z } from "zod";

interface User {
  id: string;
  username: string;
}

const columnHelper = createColumnHelper<User>();

const columns = [
  columnHelper.accessor("username", {
    header: "Username",
  }),
  columnHelper.display({
    header: "Settings",
    cell: (row) => (
      <LinkButton
        variant="outlined"
        to={"/admin/users/$userId"}
        params={{
          userId: row.row.original.id,
        }}
      >
        Settings
      </LinkButton>
    ),
  }),
];

const defaultValues = {
  query: "",
};

const searchSchema = z.object({
  query: z.string().default(defaultValues.query),
});

export const Route = createFileRoute("/_authenticated/admin_/users/")({
  validateSearch: searchSchema,
  search: {
    middlewares: [stripSearchParams(defaultValues)],
  },
  loaderDeps: ({ search }) => ({ search }),
  loader: ({ context: { queryClient }, deps: { search } }) => {
    queryClient.prefetchInfiniteQuery(
      usersQueryOptions.userList({
        limit: 10,
        search: search.query,
      }),
    );
  },
  head: () => ({
    meta: [
      {
        title: "Admin - Users",
      },
    ],
  }),
  component: Component,
});

function Component() {
  const { query } = Route.useSearch();
  const navigate = Route.useNavigate();

  const setSearch = useCallback(
    (v: string) =>
      navigate({
        search: {
          query: v,
        },
      }),
    [navigate],
  );

  return (
    <Stack sx={{ height: "100%", display: "flex", gap: 2 }}>
      <TextField
        onChange={(e) => setSearch(e.target.value)}
        defaultValue={query}
        label="Search"
        placeholder="Search for users"
        fullWidth
        slotProps={{
          inputLabel: {
            shrink: true,
          },
        }}
      />
      <Suspense fallback={<SkeletonDataTable />}>
        <UsersTable />
      </Suspense>
    </Stack>
  );
}

const skeletonColumns = [
  columnHelper.accessor("username", {
    header: "Username",
    cell: () => <Skeleton width={100} />,
  }),
  columnHelper.display({
    header: "Settings",
    cell: () => (
      <Button loading variant="outlined">
        Settings
      </Button>
    ),
  }),
];

const skeletonLength = 10;

const skeletonData: User[] = Array.from({ length: skeletonLength }, (_, i) => ({
  id: i.toString(),
  username: "",
}));

function SkeletonDataTable() {
  return (
    <Datatable
      columns={skeletonColumns}
      data={skeletonData}
      sx={{
        flex: 1,
      }}
    />
  );
}

function UsersTable() {
  const { query } = Route.useSearch();
  const navigate = Route.useNavigate();

  // Don't use suspense here because we want to keep the previous data and don't suspend on fetch (breaks search)
  const usersQuery = useSuspenseInfiniteQuery(
    usersQueryOptions.userList({
      limit: 10,
      search: query,
    }),
  );

  const pagedItems = useMemo(
    () => usersQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [usersQuery.data],
  );

  const total = useMemo(
    () => usersQuery.data?.pages.at(-1)?.total ?? 0,
    [usersQuery.data],
  );

  const setSearch = useCallback(
    (v: string) =>
      navigate({
        search: {
          query: v,
        },
      }),
    [navigate],
  );

  return (
    <InfiniteDatatable
      scrollRestorationId="users"
      columns={columns}
      data={pagedItems}
      globalFilter={query}
      setGlobalFilter={setSearch}
      fetchNextPage={usersQuery.fetchNextPage}
      isFetching={usersQuery.isFetching}
      totalDBRowCount={total}
      fixedHeight={69.5}
      sx={{
        flex: 1,
      }}
    />
  );
}
