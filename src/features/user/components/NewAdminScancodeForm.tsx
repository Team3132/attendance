import ScanAdornment from "@/components/ScanAdornment";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Stack, TextField } from "@mui/material";
import { useCallback } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import useCreateUserScancode from "../hooks/useCreateUserScancode";

const NewScancodeSchema = z.object({
  code: z
    .string()
    .min(6)
    .regex(/^[a-zA-Z0-9]+$/, {
      message: "Event code must be alphanumeric",
    }),
});

interface NewAdminScancodeListItemProps {
  userId: string;
}

export default function NewAdminScancodeListItem(
  props: NewAdminScancodeListItemProps,
) {
  const { userId } = props;
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    setValue,
    reset,
  } = useForm({
    resolver: zodResolver(NewScancodeSchema),
    defaultValues: {
      code: "",
    },
  });

  const createUserScancodeMutation = useCreateUserScancode();

  const onSubmit = handleSubmit(async (data) => {
    try {
      await createUserScancodeMutation.mutateAsync({
        data: {
          userId,
          scancode: data.code,
        },
      });

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
    <Stack component={"form"} onSubmit={onSubmit} gap={2}>
      <TextField
        required
        label={"New Scancode"}
        {...register("code", {
          required: "Event code cannot be empty",
        })}
        fullWidth
        error={!!errors.code}
        helperText={errors.code?.message}
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
