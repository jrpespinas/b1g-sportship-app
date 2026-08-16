import { Scale } from "lucide-react";
import { Butterfly } from "@/components/charts/butterfly";
import { Panel, PanelHeader } from "@/components/ui/panel";
import type { SupplyDemand } from "@/lib/supply-demand";

/**
 * Four butterflies: what leaders offer against what seekers want.
 *
 * All four are drawn even though three of them mirror almost perfectly,
 * because **the overlap is the finding** — it says three of the four
 * constraints are not constraints — and it is what makes the fourth legible.
 * A panel showing only the dimension that disagreed would leave a reader
 * unable to tell whether the others had been checked at all.
 *
 * Time sits alone in the left column and the three that agree stack beside
 * it, so the contrast is the layout as well as the marks. The time column is
 * an hour axis in clock order, sixteen rows deep; the other three are short
 * categorical lists, and stacking them is what makes the two columns balance.
 */
export function SupplyDemandPanel({ data }: { data: SupplyDemand }) {
  const [gapDimension, ...rest] = data.dimensions;

  return (
    <Panel className="mt-3">
      <PanelHeader
        title="What leaders offer, what seekers want"
        icon={Scale}
        subtitle={`Groups running now · ${data.plannedLeaders} more planned`}
      />

      <div className="grid grid-cols-1 gap-x-8 gap-y-7 p-5 lg:grid-cols-2">
        <Butterfly
          dimension={gapDimension}
          offerRespondents={data.offerRespondents}
          wantRespondents={data.wantRespondents}
        />
        <div className="flex flex-col gap-7">
          {rest.map((dimension) => (
            <Butterfly
              key={dimension.key}
              dimension={dimension}
              offerRespondents={data.offerRespondents}
              wantRespondents={data.wantRespondents}
            />
          ))}
        </div>
      </div>
    </Panel>
  );
}
