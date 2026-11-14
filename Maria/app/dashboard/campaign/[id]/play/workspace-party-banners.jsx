"use client";

import { cloneElement, useEffect, useRef, useState } from "react";

const BANNER_WIDTH = 352;
const GAP = 8;

export default function WorkspacePartyBanners({ children }) {
  const root = useRef(null);
  const [layout, setLayout] = useState({
    scale: 0,
    columns: 1,
    rows: [1],
    centers: [],
    gutter: 0,
  });

  useEffect(() => {
    const list = root.current;
    const sidebar = list.closest(".workspace-sidebar");
    const heading = sidebar.querySelector(".workspace-party-heading");
    const log = sidebar.querySelector(".workspace-log");
    const contents = [...list.querySelectorAll("[data-banner-content]")];
    const controls = [...list.querySelectorAll("[data-banner-controls]")];

    function measure() {
      if (!contents.length || !list.clientWidth) return;
      const heights = contents.map(
        (content) => content.parentElement.offsetHeight,
      );
      const centers = contents.map((content) => content.offsetHeight / 2);
      const gutter = Math.max(
        0,
        ...contents.map((content) => {
          const pips = content.querySelector("[data-inspiration-pips]");
          return pips
            ? pips.offsetWidth + parseFloat(getComputedStyle(pips).marginRight)
            : 0;
        }),
      );
      const padding = getComputedStyle(list.parentElement);
      const available = Math.max(
        1,
        sidebar.clientHeight -
          heading.offsetHeight -
          parseFloat(getComputedStyle(log).minHeight) -
          parseFloat(padding.paddingTop) -
          parseFloat(padding.paddingBottom),
      );

      let best = {
        scale: 0,
        columns: 1,
        rows: heights,
        centers,
        gutter,
      };
      for (
        let columns = 1;
        columns <= Math.min(2, contents.length);
        columns += 1
      ) {
        const rows = [];
        for (let index = 0; index < heights.length; index += columns) {
          rows.push(Math.max(...heights.slice(index, index + columns)));
        }
        const height = rows.reduce((total, row) => total + row, 0);
        const scale = Math.max(
          0,
          Math.min(
            (list.clientWidth - GAP * (columns - 1)) /
              (BANNER_WIDTH * columns + gutter * (columns - 1)),
            (available - GAP * (rows.length - 1)) / height,
          ),
        );
        if (scale > best.scale)
          best = { scale, columns, rows, centers, gutter };
      }

      setLayout((current) =>
        current.scale === best.scale &&
        current.columns === best.columns &&
        current.gutter === best.gutter &&
        current.rows.join() === best.rows.join() &&
        current.centers.join() === best.centers.join()
          ? current
          : best,
      );
    }

    const observer = new ResizeObserver(measure);
    observer.observe(list);
    observer.observe(sidebar);
    contents.forEach((content) => observer.observe(content));
    controls.forEach((control) => observer.observe(control));
    return () => observer.disconnect();
  }, [children]);

  return (
    <ul
      ref={root}
      className="workspace-party-banners"
      aria-busy={layout.scale === 0}
      style={{
        "--party-banner-width": `${BANNER_WIDTH}px`,
        "--party-banner-scale": layout.scale,
        "--party-banner-gutter": `${layout.gutter * layout.scale}px`,
        gridTemplateColumns: `repeat(${layout.columns}, ${BANNER_WIDTH * layout.scale}px)`,
        gridTemplateRows: layout.rows
          .map((height) => `${height * layout.scale}px`)
          .join(" "),
        gap: `${GAP}px`,
        columnGap: `${GAP + layout.gutter * layout.scale}px`,
      }}
    >
      {children.map((child, index) =>
        cloneElement(child, {
          style: {
            "--party-banner-center": `${(layout.centers[index] ?? 0) * layout.scale}px`,
          },
        }),
      )}
    </ul>
  );
}
