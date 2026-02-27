import { isMobile } from "@/utils/isTauri";
import { Button, InputAdornment } from "@mui/material";
import { useMutation } from "@tanstack/react-query";
import type { ScanOptions } from "@tauri-apps/plugin-barcode-scanner";
import { useEffect } from "react";
import { toaster } from "./Toaster";

interface ScanButtonProps {
  setSearch: (v: string) => void;
}

export default function ScanAdornment(props: ScanButtonProps) {
  const mutation = useMutation({
    mutationFn: async (scanOptions?: ScanOptions) => {
      const { scan, openAppSettings, checkPermissions } = await import(
        "@tauri-apps/plugin-barcode-scanner"
      );

      const permissions = await checkPermissions();

      if (permissions === "prompt") await openAppSettings();

      if (permissions === "denied")
        toaster.error({
          title: "Permission Error",
          description:
            "Permission denied, if you wish to use this feature enable camera permission in settings.",
        });

      return scan(scanOptions);
    },
    onError: (error) => {
      toaster.error({
        title: "Error occured",
        description: JSON.stringify(error, null, 2),
      });
    },
    onSuccess: (data) => {
      setSearch(data.content);
    },
  });

  useEffect(() => {
    return () => {
      (async () => {
        try {
          const { cancel } = await import("@tauri-apps/plugin-barcode-scanner");
          await cancel();
        } catch (error) {
          console.log("failed to cancel", error);
        }
      })();
    };
  }, []);

  const { setSearch } = props;

  if (!isMobile) {
    return null;
  }

  return (
    <InputAdornment position="end">
      <Button
        size="small"
        variant="contained"
        loading={mutation.isPending}
        onClick={() => mutation.mutate({})}
      >
        Scan
      </Button>
    </InputAdornment>
  );
}
