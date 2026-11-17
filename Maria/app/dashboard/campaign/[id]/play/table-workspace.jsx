"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import { useReducedMotion } from "@/app/components/use-reduced-motion";
import CloseButton from "@/app/components/ui/close-button";
import { playReveal } from "@/app/components/ui/reveal-animation";

import { useInCombat } from "./table-state";
import TableTitle from "./table-title";
import "./table-workspace.css";

const WorkspaceContext = createContext(null);
const WorkspacePanelContext = createContext(null);
const CLOSED = {
  id: null,
  open: false,
  previous: null,
  direction: null,
  revision: 0,
};

export function useTableWorkspace() {
  return useContext(WorkspaceContext);
}

export default function TableWorkspace({
  title,
  exit,
  cast,
  tools,
  boardTools,
  dice,
  party,
  initiative,
  mapRoll,
  activity,
  children,
}) {
  const frame = useRef(null);
  const [selection, setSelection] = useState(CLOSED);
  const [panel, setPanel] = useState(null);
  const [mapTools, setMapTools] = useState(null);
  const [dmTools, setDmTools] = useState(null);
  const [rollTools, setRollTools] = useState(null);
  const inCombat = useInCombat();
  const reduceMotion = useReducedMotion();
  const { id: selected, open, previous, direction, revision } = selection;
  const showing = Boolean(selected);

  const close = useCallback((id) => {
    setSelection((current) =>
      current.open && (!id || current.id === id)
        ? { ...current, open: false }
        : current,
    );
  }, []);

  const choose = useCallback(
    (id, button) => {
      if (open && selected === id) {
        close(id);
        return;
      }

      const former = selected && document.getElementById(`${selected}-trigger`);
      const switching = former && selected !== id && !reduceMotion;
      const above =
        switching &&
        Boolean(
          button.compareDocumentPosition(former) &
          Node.DOCUMENT_POSITION_FOLLOWING,
        );

      setSelection((current) => ({
        id,
        open: true,
        previous: switching ? selected : null,
        direction: switching ? (above ? "down" : "up") : null,
        revision: current.revision + 1,
      }));
    },
    [close, open, reduceMotion, selected],
  );

  const finishSlide = useCallback((finishedRevision) => {
    setSelection((current) =>
      current.revision === finishedRevision && current.previous
        ? { ...current, previous: null, direction: null }
        : current,
    );
  }, []);

  useLayoutEffect(() => {
    if (!showing) return;

    const animation = playReveal(frame.current, "workspace-panel-reveal", open);
    if (open) {
      animation?.catch(() => {});
      return;
    }

    let active = true;
    Promise.resolve(animation).then(
      () => {
        if (active)
          setSelection((current) => (current.open ? current : CLOSED));
      },
      () => {},
    );
    return () => {
      active = false;
    };
  }, [open, reduceMotion, showing]);

  const workspace = useMemo(
    () => ({ close, mapTools, dmTools, rollTools }),
    [close, mapTools, dmTools, rollTools],
  );
  const panelState = useMemo(
    () => ({
      selected,
      open,
      previous,
      direction,
      revision,
      choose,
      close,
      finishSlide,
      panel,
    }),
    [
      selected,
      open,
      previous,
      direction,
      revision,
      choose,
      close,
      finishSlide,
      panel,
    ],
  );

  return (
    <WorkspaceContext.Provider value={workspace}>
      <section
        data-table-workspace
        data-combat={inCombat || undefined}
        className="table-workspace"
      >
        <header className="workspace-header">
          <div data-table-arrival-content="up">{exit}</div>
          <TableTitle title={title} workspace />
          <div data-table-arrival-content="up" className="justify-self-end">
            {cast}
          </div>
        </header>

        <nav aria-label="Table tools" className="workspace-navigation">
          <WorkspacePanelContext.Provider value={panelState}>
            <div className="workspace-navigation-inner">{tools}</div>
          </WorkspacePanelContext.Provider>
          {boardTools && (
            <div className="workspace-board-tools">{boardTools}</div>
          )}
          {initiative && (
            <div
              data-table-arrival-content="left"
              className="workspace-initiative-dock"
            >
              {initiative}
            </div>
          )}
        </nav>

        <div className="workspace-board">
          <div data-table-arrival-map className="workspace-map">
            {children}
            {mapRoll}
          </div>
          <div
            ref={frame}
            className="workspace-panel-host"
            data-visible={showing || undefined}
            data-slide={direction || undefined}
            inert={!open || undefined}
          >
            <div
              aria-hidden="true"
              data-table-arrival-content
              className="workspace-panel-glow"
            >
              <div className="workspace-panel-frame" />
              <div className="workspace-panel-arrow" />
            </div>
            <div data-table-arrival-content className="workspace-panel-reveal">
              <div ref={setPanel} className="workspace-panel-pages" />
            </div>
          </div>
        </div>

        <aside aria-label="Party and activity" className="workspace-sidebar">
          <section aria-label="Your party" className="workspace-party">
            <h2
              data-table-arrival-content="right"
              className="workspace-party-heading"
            >
              Party
            </h2>
            <div className="workspace-party-list scroll-gold">{party}</div>
          </section>
          {activity}
        </aside>
        <footer className="workspace-bottom">
          <div
            data-table-arrival-content="bottom"
            className="workspace-bottom-content"
          >
            <div className="workspace-controls-row">
              {dice}
              <div ref={setRollTools} className="workspace-roll-controls" />
              <div ref={setMapTools} className="workspace-map-tools" />
            </div>
            <div ref={setDmTools} className="workspace-dm-tools" />
          </div>
        </footer>
      </section>
    </WorkspaceContext.Provider>
  );
}

export function WorkspaceTool({
  name,
  title = name,
  label = name,
  icon,
  meta,
  onShortcut,
  children,
}) {
  const id = useId();
  const panelId = `${id}-panel`;
  const trigger = useRef(null);
  const body = useRef(null);
  const {
    selected,
    open: frameOpen,
    previous,
    direction,
    revision,
    choose,
    close,
    finishSlide,
    panel,
  } = useContext(WorkspacePanelContext);
  const current = selected === id;
  const [visited, setVisited] = useState(false);
  if (current && !visited) setVisited(true);
  const open = frameOpen && current;
  const leaving = previous === id;
  const visible = current || leaving;

  useEffect(() => () => close(id), [close, id]);

  useLayoutEffect(() => {
    if (!current || !panel) return;

    const button = trigger.current;
    const navigation = button.closest(".workspace-navigation-inner");
    const host = panel.closest(".workspace-panel-host");

    function align() {
      const bounds = button.getBoundingClientRect();
      const visible = navigation.getBoundingClientRect();
      const center = bounds.top + bounds.height / 2;
      const origin = center - host.getBoundingClientRect().top;
      const aligned =
        center >= visible.top &&
        center <= visible.bottom &&
        origin >= 12 &&
        origin <= host.clientHeight - 12;
      host.style.setProperty(
        "--workspace-arrow-y",
        `${Math.max(12, Math.min(host.clientHeight - 12, origin))}px`,
      );
      host.toggleAttribute("data-arrow-hidden", !aligned);
    }

    align();
    const observer = new ResizeObserver(align);
    observer.observe(navigation);
    observer.observe(host);
    navigation.addEventListener("scroll", align);
    return () => {
      observer.disconnect();
      navigation.removeEventListener("scroll", align);
    };
  }, [current, panel]);

  useLayoutEffect(() => {
    if (open) body.current?.focus({ preventScroll: true });
  }, [open, panel]);

  return (
    <>
      <button
        ref={trigger}
        id={`${id}-trigger`}
        type="button"
        onClick={(event) => choose(id, event.currentTarget)}
        aria-label={label}
        aria-expanded={open}
        aria-controls={panelId}
        className={`workspace-tool ${open ? "workspace-tool-selected" : ""}`}
      >
        <span aria-hidden="true" className="workspace-tool-icon">
          {icon}
        </span>
        <span>{name}</span>
      </button>
      {visited &&
        panel &&
        createPortal(
          <section
            ref={body}
            id={panelId}
            aria-label={title}
            tabIndex={-1}
            hidden={!visible}
            inert={!open || undefined}
            data-slide={
              direction && (current ? "in" : leaving ? "out" : undefined)
            }
            className="workspace-panel"
            onAnimationEnd={(event) => {
              if (
                event.target === event.currentTarget &&
                event.animationName === "workspace-page-out"
              )
                finishSlide(revision);
            }}
            onKeyDown={(event) => {
              if (event.defaultPrevented || event.target.closest("dialog"))
                return;
              if (event.key === "Escape") {
                event.stopPropagation();
                close();
                trigger.current?.focus({ preventScroll: true });
              } else if (
                onShortcut &&
                event.key === "Enter" &&
                (event.ctrlKey || event.metaKey)
              ) {
                event.preventDefault();
                onShortcut();
              }
            }}
          >
            <div className="workspace-panel-heading">
              <h2 className="min-w-0 flex-1 font-display text-lg font-semibold leading-snug text-ink">
                {title}
              </h2>
              {meta}
              <CloseButton
                label={`Close ${name.toLowerCase()}`}
                onClick={() => {
                  close();
                  trigger.current?.focus({ preventScroll: true });
                }}
              />
            </div>
            <div className="workspace-panel-body scroll-gold">
              {typeof children === "function" ? children(open) : children}
            </div>
          </section>,
          panel,
        )}
    </>
  );
}
