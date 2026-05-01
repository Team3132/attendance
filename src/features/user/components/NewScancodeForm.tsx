import ControlledTextField from "@/components/ControlledTextField";
import ScanAdornment from "@/components/ScanAdornment";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Stack } from "@mui/material";
import { useCallback } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import useCreateSelfScancode from "../hooks/useCreateSelfScancode";

const NewScancodeSchema = z.object({
  code: z
    .string()
    .min(6)
    .regex(/^[a-zA-Z0-9]+$/, {
      message: "Event code must be alphanumeric",
    }),
});

export default function NewScancodeListItem() {
  const {
    handleSubmit,
    formState: { isSubmitting },
    setError,
    reset,
    setValue,
    control,
  } = useForm({
    resolver: zodResolver(NewScancodeSchema),
    defaultValues: {
      code: "",
    },
  });

  const createSelfScancodeMutation = useCreateSelfScancode();

  const onSubmit = handleSubmit(async (data) => {
    try {
      await createSelfScancodeMutation.mutateAsync({ data: data.code });

      reset({
        code: "",
      });
    } catch (error) {
      if (error instanceof Error) {
        setError("code", {
          message: error.message,
        });
      }
    }
  });

  const handleScan = useCallback(
    (v: string) => {
      setValue("code", v);
      onSubmit();
    },
    [setValue, onSubmit],
  );

  return (
    <Stack component={"form"} onSubmit={onSubmit} sx={{ gap: 2 }}>
      <ControlledTextField
        required
        label={"New Scancode"}
        control={control}
        name={"code"}
        rules={{
          required: "Event code is required",
        }}
        slotProps={{
          input: {
            endAdornment: <ScanAdornment setSearch={handleScan} />,
          },
        }}
      />
      <Button
        loading={isSubmitting}
        type={"submit"}
        variant="contained"
        size="large"
      >
        Create
      </Button>
    </Stack>
  );
}
