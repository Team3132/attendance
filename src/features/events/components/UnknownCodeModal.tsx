import ControlledAutocomplete from "@/components/ControlledAutocomplete";
import ControlledTextField from "@/components/ControlledTextField";
import { usersQueryOptions } from "@/queries/users.queries";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Stack,
} from "@mui/material";
import { keepPreviousData } from "@tanstack/react-query";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import {
  type FieldPath,
  type FieldValues,
  type UseControllerProps,
  useForm,
} from "react-hook-form";
import { useDebounceValue } from "usehooks-ts";
import { z } from "zod";
import { useDisclosure } from "../../../hooks/useDisclosure";
import useCreateUserScancode from "../../user/hooks/useCreateUserScancode";

interface UnknownCodeModalProps {
  code: string;
  open: boolean;
  onClose: () => void;
  onOpen: () => void;
  successCallback?: (code: string) => void;
}

const UserOptionSchema = z.object({
  label: z.string().nonempty(),
  value: z.string().nonempty(),
});

const RegisterNewCodeFormSchema = z.object({
  code: z
    .string()
    .nonempty({
      message: "Scancode code cannot be empty",
    })
    .regex(/^[a-zA-Z0-9]+$/, {
      message: "Scancode code must be alphanumeric",
    })
    .min(6),
  userOption: UserOptionSchema.nullable().default(null),
});

export default function UnknownCodeModal(props: UnknownCodeModalProps) {
  const { code, open, onClose, successCallback } = props;

  const {
    formState: { isSubmitting },
    handleSubmit,
    control,
    reset,
    setError,
  } = useForm({
    resolver: zodResolver(RegisterNewCodeFormSchema),
    defaultValues: {
      code: "",
      userOption: null,
    },
  });

  useEffect(() => {
    reset({
      code,
    });
  }, [code, reset]);

  const createScancodeMutation = useCreateUserScancode();

  const onSubmit = handleSubmit(async (data) => {
    if (!data.userOption) {
      setError("userOption", {
        message: "Please select a user",
        type: "required",
      });
      return;
    }

    try {
      const createdCode = await createScancodeMutation.mutateAsync({
        data: { scancode: data.code, userId: data.userOption?.value },
      });

      if (successCallback) {
        successCallback(createdCode.code);
      }

      onClose();
    } catch (error) {
      if (error instanceof Error) {
        setError("code", {
          message: error.message,
        });
      } else {
        setError("code", {
          message: "An unknown error occurred",
        });
      }
    }
  });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      component={"form"}
      onSubmit={onSubmit}
    >
      <DialogTitle>Register new code</DialogTitle>
      <DialogContent>
        <DialogContentText>
          To register a new code, please select a user to associate it with.
        </DialogContentText>
        <Stack
          sx={{
            mt: 2,
            justifyItems: "start",
            gap: 2,
          }}
        >
          <SearchingAutocomplete control={control} name="userOption" />
          <ControlledTextField
            control={control}
            name="code"
            label="Code"
            required
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button type="submit" loading={isSubmitting}>
          Register
        </Button>
      </DialogActions>
    </Dialog>
  );
}

type SearchingTextFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = UseControllerProps<TFieldValues, TName> & {
  handleSelect?: (data: { value: string } | null) => void;
};

function SearchingAutocomplete<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>(props: SearchingTextFieldProps<TFieldValues, TName>) {
  const { control, name, handleSelect } = props;

  const { getDisclosureProps, isOpen: isAutocompleteOpen } = useDisclosure();

  const [debouncedInputValue, setInputValue] = useDebounceValue("", 500);

  const usersQuery = useInfiniteQuery({
    ...usersQueryOptions.userList({
      search: debouncedInputValue,
      limit: 10,
    }),
    enabled: isAutocompleteOpen,
    placeholderData: keepPreviousData,
  });

  const userOption = useMemo(
    () =>
      usersQuery.data?.pages
        ?.flatMap((page) => page.items)
        .map((user) => ({
          label: user.username,
          value: user.id,
        })) ?? [],
    [usersQuery.data],
  );

  return (
    <ControlledAutocomplete
      control={control}
      name={name}
      label="User"
      placeholder="Select a user"
      helperText="Select the user to add the code to"
      options={userOption}
      onInputChange={(_, value) => setInputValue(value)}
      loading={usersQuery.isFetching}
      required
      onChange={handleSelect}
      {...getDisclosureProps()}
    />
  );
}
