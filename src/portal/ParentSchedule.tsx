import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { parentApi } from "@/api/parentApi";
import StudentSchedule from "./StudentSchedule";

export default function ParentSchedule() {
  const childrenQuery = useQuery({
    queryKey: ["parent-children"],
    queryFn: async () => (await parentApi.getChildren()).data,
  });
  const [selectedChildId, setSelectedChildId] = useState("");

  useEffect(() => {
    const children = childrenQuery.data || [];
    if (!selectedChildId && children[0]?.id) setSelectedChildId(children[0].id);
    if (selectedChildId && !children.some((child) => child.id === selectedChildId)) {
      setSelectedChildId(children[0]?.id || "");
    }
  }, [childrenQuery.data, selectedChildId]);

  return <StudentSchedule
    parentView
    children={childrenQuery.data || []}
    childrenLoading={childrenQuery.isLoading}
    childrenError={childrenQuery.isError}
    selectedChildId={selectedChildId}
    onSelectChild={setSelectedChildId}
    onRetryChildren={() => void childrenQuery.refetch()}
  />;
}
