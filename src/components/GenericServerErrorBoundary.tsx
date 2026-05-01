import { Button, Stack, Typography } from "@mui/material";
import { FaArrowLeft } from "react-icons/fa6";
import { MdRefresh } from "react-icons/md";
import QueryErrorBoundary from "./QueryErrorBoundary";

interface GenericServerErrorBoundaryProps {
  children: React.ReactNode;
}

export default function GenericServerErrorBoundary(
  props: GenericServerErrorBoundaryProps,
) {
  const { children } = props;

  return (
    <QueryErrorBoundary
      fallbackRender={({ resetErrorBoundary, error, handleBack }) => {
        console.error(error);

        const errorMessage =
          error instanceof Error ? error.message : "An error occurred";

        return (
          <Stack
            sx={{
              gap: 2,
              textAlign: "center",
              justifyContent: "center",
              height: "100%",
            }}
          >
            <Typography variant="h5">{errorMessage}</Typography>
            <Stack direction="row" sx={{ justifyContent: "center", gap: 2 }}>
              <Button
                onClick={handleBack}
                variant="contained"
                startIcon={<FaArrowLeft />}
              >
                Back
              </Button>
              <Button
                onClick={resetErrorBoundary}
                variant="contained"
                endIcon={<MdRefresh />}
              >
                Retry
              </Button>
            </Stack>
          </Stack>
        );
      }}
    >
      {children}
    </QueryErrorBoundary>
  );
}
