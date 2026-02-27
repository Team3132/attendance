import ControlledTextField from "@/components/ControlledTextField";
import ScanAdornment from "@/components/ScanAdornment";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Paper, Stack, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";
import { useCallback, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useDisclosure } from "../../../hooks/useDisclosure";
import useScanin from "../hooks/useScanin";
import UnknownCodeModal from "./UnknownCodeModal";

interface ScaninCardProps {
  eventId: string;
}

const ScaninSchema = z.object({
  code: z
    .string()
    .nonempty()
    .regex(/^[a-zA-Z0-9]+$/),
});

const PaddedPaper = styled(Paper)({
  padding: 2,
});

export default function ScaninCard(props: ScaninCardProps) {
  const { eventId } = props;
  const [unknownCode, setUnknownCode] = useState<string | undefined>(undefined);
  const { getDisclosureProps, onOpen } = useDisclosure();

  const {
    setFocus,
    control,
    formState: { isSubmitting },
    handleSubmit,
    reset,
    setValue,
  } = useForm({
    resolver: zodResolver(ScaninSchema),
    defaultValues: {
      code: "",
    },
  });

  const scanInMutation = useScanin();

  const onSubmit = useCallback(
    () =>
      handleSubmit(async (data) => {
        try {
          await scanInMutation.mutateAsync({
            data: { eventId, scancode: data.code },
          });
          reset({
            code: "",
          });

          setUnknownCode(undefined);
          setFocus("code");
        } catch (error) {
          if (error instanceof Error) {
            setUnknownCode(data.code);
            onOpen();
          }
        }
      }),
    [eventId, onOpen, reset, scanInMutation, setFocus, handleSubmit],
  );

  const codeCreatedCallback = useCallback(
    (createdCode: string) => {
      setValue("code", createdCode);
      onSubmit();
    },
    [onSubmit, setValue],
  );

  return (
    <PaddedPaper>
      <Stack gap={2} component={"form"} onSubmit={onSubmit}>
        <Typography variant="h5" textAlign={"center"}>
          Scan In
        </Typography>

        <ControlledTextField
          control={control}
          name="code"
          label="Code"
          helperText={"Enter a code to scan in"}
          slotProps={{
            input: {
              endAdornment: <ScanAdornment setSearch={codeCreatedCallback} />,
            },
          }}
        />
        <Button
          type="submit"
          variant="contained"
          color="primary"
          loading={isSubmitting}
        >
          Scan In
        </Button>
      </Stack>
      {unknownCode ? (
        <UnknownCodeModal
          code={unknownCode}
          {...getDisclosureProps()}
          successCallback={codeCreatedCallback}
        />
      ) : null}
    </PaddedPaper>
  );
}
