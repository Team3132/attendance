import { tauriMutationOptions } from "@/queries/tauri.queries";
import { Button, LinearProgress, Stack, Typography } from "@mui/material";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { Update } from "@tauri-apps/plugin-updater";
import { useCallback, useMemo, useState } from "react";

export const Route = createFileRoute("/_authenticated/update")({
  component: RouteComponent,
});

function RouteComponent() {
  const [updateState, setUpdateState] = useState<Update | null>(null);
  const [downloaded, setDownloaded] = useState<number | undefined>(undefined);
  const [contentLength, setContentLength] = useState<number | undefined>(
    undefined,
  );
  const [installAvailable, setInstallAvailable] = useState(false);

  const progress = useMemo(
    () =>
      downloaded !== undefined && contentLength !== undefined
        ? Math.round((downloaded / contentLength) * 100)
        : 0,
    [downloaded, contentLength],
  );

  const updateCheckMutation = useMutation({
    ...tauriMutationOptions.updateCheck,
  });

  const handleCheckUpdate = useCallback(async () => {
    const update = await updateCheckMutation.mutateAsync(undefined);
    setUpdateState(update);
  }, [updateCheckMutation.mutateAsync]);

  const handleDownload = useCallback(async () => {
    if (!updateState) return;
    await updateMutation.mutate(updateState);
  }, [updateState]);

  const updateMutation = useMutation({
    mutationFn: (update: Update) =>
      update.download((downloadEvent) => {
        switch (downloadEvent.event) {
          case "Started":
            setContentLength(downloadEvent.data.contentLength);
            setDownloaded(0);
            setInstallAvailable(false);
            break;
          case "Progress":
            setDownloaded((prev) =>
              prev !== undefined
                ? prev + downloadEvent.data.chunkLength
                : downloadEvent.data.chunkLength,
            );
            break;
          case "Finished":
            setInstallAvailable(true);
            break;
        }
      }),
  });

  const installMutation = useMutation({
    mutationFn: (update: Update) => update.install(),
  });

  const handleInstall = useCallback(() => {
    if (!updateState) return;
    installMutation.mutate(updateState);
  }, [installMutation.mutate, updateState]);

  return (
    <Stack>
      <Stack direction={"row"}>
        <Button
          onClick={handleCheckUpdate}
          loading={updateCheckMutation.isPending}
        >
          Check
        </Button>
        <Button
          disabled={updateState === null}
          onClick={handleDownload}
          loading={updateMutation.isPending}
        >
          Download
        </Button>
        <Button
          disabled={!installAvailable}
          onClick={handleInstall}
          loading={installMutation.isPending}
        >
          Install
        </Button>
      </Stack>
      <LinearProgress
        value={progress}
        variant="determinate"
        color={installAvailable ? "success" : undefined}
      />
      {`${progress}%`}
      {updateState !== null ? (
        <Typography>
          An update is available
          <br />
          {`${updateState.currentVersion} to ${updateState.version}`}
          <br />
          <br />
          {updateState.body}
        </Typography>
      ) : null}
    </Stack>
  );
}
