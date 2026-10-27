import { test } from "node:test";
import assert from "node:assert/strict";
import { metaRows } from "./meta";
import { dailyPostTotals, formatOf, postRows } from "./instagram";

test("Meta: separa leads de conversaciones y suma totales por día", () => {
  const rows = metaRows([
    { date_start: "2026-10-20", campaign_name: "A", impressions: "1000", inline_link_clicks: "20", spend: "150.5", actions: [{ action_type: "lead", value: "2" }, { action_type: "onsite_conversion.messaging_conversation_started_7d", value: "3" }, { action_type: "link_click", value: "20" }] },
    { date_start: "2026-10-20", campaign_name: "B", impressions: "500", inline_link_clicks: "5", spend: "49.5" },
  ]);
  const total = (m: string) => rows.find((r) => r.dimKey === "" && r.metric === m)?.value;
  assert.equal(total("spend_mxn"), 200);
  assert.equal(total("leads"), 2);
  assert.equal(total("conversations"), 3);
  assert.equal(total("clicks"), 25);
});

test("Instagram: formato por tipo y totales diarios por fecha de publicación", () => {
  assert.equal(formatOf({ media_type: "VIDEO", media_product_type: "REELS" }), "reel");
  assert.equal(formatOf({ media_type: "CAROUSEL_ALBUM" }), "carrusel");
  const rows = postRows({ id: "1", media_type: "IMAGE", timestamp: "2026-10-21T02:00:00+0000", permalink: "x" }, [{ name: "reach", values: [{ value: 300 }] }, { name: "total_interactions", values: [{ value: 25 }] }]);
  assert.equal(rows[0].date, "2026-10-20"); // 2 a. m. UTC = 8 p. m. del día anterior en México
  const t = dailyPostTotals(rows);
  assert.deepEqual(t.map((r) => [r.metric, r.value]), [["posts", 1], ["post_interactions", 25], ["post_reach", 300]]);
});
