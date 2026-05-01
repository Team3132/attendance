import {
  Autocomplete,
  type AutocompleteProps,
  type AutocompleteValue,
  type ChipTypeMap,
  TextField,
} from "@mui/material";
import {
  type FieldPath,
  type FieldValues,
  type UseControllerProps,
  useController,
} from "react-hook-form";

type BaseAutocompleteProps<
  Value,
  Multiple extends boolean | undefined,
  DisableClearable extends boolean | undefined,
  FreeSolo extends boolean | undefined,
  ChipComponent extends React.ElementType,
> = Omit<
  AutocompleteProps<Value, Multiple, DisableClearable, FreeSolo, ChipComponent>,
  "onChange" | "value" | "defaultValue" | "renderInput" | "onBlur" | "error"
>;

type OnChangeValue<
  Value,
  Multiple extends boolean | undefined,
  DisableClearable extends boolean | undefined,
  FreeSolo extends boolean | undefined,
> = (
  value: AutocompleteValue<Value, Multiple, DisableClearable, FreeSolo>,
) => void;

type ControlledAutocompleteProps<
  Value,
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
  Multiple extends boolean | undefined = false,
  DisableClearable extends boolean | undefined = false,
  FreeSolo extends boolean | undefined = false,
  ChipComponent extends React.ElementType = ChipTypeMap["defaultComponent"],
> = BaseAutocompleteProps<
  Value,
  Multiple,
  DisableClearable,
  FreeSolo,
  ChipComponent
> &
  UseControllerProps<TFieldValues, TName> & {
    label?: string;
    placeholder?: string;
    helperText?: string;
    required?: boolean;
    onChange?: OnChangeValue<Value, Multiple, DisableClearable, FreeSolo>;
  };

export default function ControlledAutocomplete<
  Value,
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
  Multiple extends boolean | undefined = false,
  DisableClearable extends boolean | undefined = false,
  FreeSolo extends boolean | undefined = false,
  ChipComponent extends React.ElementType = ChipTypeMap["defaultComponent"],
>(
  props: ControlledAutocompleteProps<
    Value,
    TFieldValues,
    TName,
    Multiple,
    DisableClearable,
    FreeSolo,
    ChipComponent
  >,
) {
  const {
    control,
    name,
    rules,
    defaultValue,
    disabled,
    shouldUnregister,
    label,
    placeholder,
    helperText,
    required = false,
    ...rest
  } = props;

  const { field, fieldState } = useController<TFieldValues, TName>({
    control,
    name,
    defaultValue,
    rules,
    disabled,
    shouldUnregister,
  });

  return (
    <Autocomplete<Value, Multiple, DisableClearable, FreeSolo, ChipComponent>
      {...(rest as AutocompleteProps<
        Value,
        Multiple,
        DisableClearable,
        FreeSolo,
        ChipComponent
      >)}
      renderInput={(params) => (
        <TextField
          {...params}
          helperText={fieldState.error ? fieldState.error.message : helperText}
          label={label}
          placeholder={placeholder}
          error={!!fieldState.error}
          disabled={disabled}
          required={required}
          slotProps={{
            inputLabel: {
              shrink: true,
            },
          }}
        />
      )}
      {...field}
      onChange={(_, value) => field.onChange(value)}
      disabled={disabled}
    />
  );
}
