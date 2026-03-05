import { usersQueryOptions } from "@/queries/users.queries";
import { List } from "@mui/material";
import { useSuspenseQuery } from "@tanstack/react-query";
import ScancodeListItem from "./AdminScancodeListItem";

interface AdminScancodeListProps {
  userId: string;
}

export default function AdminScancodeList(props: AdminScancodeListProps) {
  const { userId } = props;
  const scancodesQuery = useSuspenseQuery(
    usersQueryOptions.userScancodes(userId),
  );

  return (
    <List>
      {scancodesQuery.data.map((scancode) => (
        <ScancodeListItem
          scancode={scancode.code}
          key={scancode.code}
          userId={userId}
        />
      ))}
    </List>
  );
}
