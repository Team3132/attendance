import { usersQueryOptions } from "@/queries/users.queries";
import { List } from "@mui/material";
import { useSuspenseQuery } from "@tanstack/react-query";
import ScancodeListItem from "./ScancodeListItem";

export default function ScancodeList() {
  const scancodesQuery = useSuspenseQuery(
    usersQueryOptions.userSelfScancodes(),
  );

  return (
    <List>
      {scancodesQuery.data.map((scancode) => (
        <ScancodeListItem code={scancode.code} key={scancode.code} />
      ))}
    </List>
  );
}
