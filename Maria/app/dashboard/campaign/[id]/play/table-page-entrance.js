import { playAnimation } from "@/app/components/ui/reveal-animation";

function prepareWorkspaceSteps(table) {
  const menus = table.querySelectorAll(
    ".workspace-navigation-inner > *, .workspace-board-tools",
  );
  const banners = table.querySelectorAll(".workspace-banner-slot");
  const activity = table.querySelectorAll(
    ".workspace-sidebar > .workspace-log ol > li",
  );

  for (const [kind, items] of [
    ["menu", menus],
    ["banner", banners],
    ["activity", activity],
  ]) {
    items.forEach((item, index) => {
      item.dataset.tableArrivalStep = kind;
      item.style.setProperty("--table-step-index", index);
    });
  }

  table.style.setProperty(
    "--table-stagger-count",
    Math.max(0, menus.length - 1, banners.length - 1, activity.length - 1),
  );
}

function isTableAnimation({ animationName, effect }) {
  return (
    animationName?.startsWith("table-arrival-") ||
    (animationName === "table-detail-unfold" &&
      effect.target?.hasAttribute?.("data-table-arrival-map"))
  );
}

export function playTableEntrance(table, open) {
  if (open && table.dataset.tableArrival === "workspace") {
    prepareWorkspaceSteps(table);
  }

  const timeline = table
    .getAnimations({ subtree: true })
    .filter(isTableAnimation);

  table.toggleAttribute("data-table-closing", !open);
  table.inert = !open;
  if (!timeline.length) return Promise.resolve();
  if (!open) table.removeAttribute("data-table-arrived");

  // A common finish time keeps each phase in order when the timeline reverses.
  const ends = timeline.map(({ effect }) => {
    const { delay, activeDuration } = effect.getComputedTiming();
    return delay + activeDuration;
  });
  const duration = Math.max(...ends);
  timeline.forEach(({ effect }, index) => {
    const endDelay = duration - ends[index];
    if (effect.getTiming().endDelay !== endDelay)
      effect.updateTiming({ endDelay });
  });

  const finished = Promise.allSettled(
    timeline.map((animation) => playAnimation(animation, open)),
  );

  return finished.then(() => {
    if (open && !table.hasAttribute("data-table-closing")) {
      table.setAttribute("data-table-arrived", "");
    }
  });
}
