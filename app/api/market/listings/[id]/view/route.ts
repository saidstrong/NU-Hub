import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/validation/uuid";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  if (!isUuid(id)) {
    return Response.json({ error: "Invalid listing id." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase.rpc("increment_listing_view_count", {
    p_listing_id: id,
  });

  if (error) {
    return Response.json({ error: "Failed to record listing view." }, { status: 500 });
  }

  return Response.json(
    {
      counted: typeof data === "number",
      viewCount: typeof data === "number" ? data : null,
    },
    { status: 200 },
  );
}
