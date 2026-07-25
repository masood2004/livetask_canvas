"use client";

import Link from "next/link";
import { ChangeEvent, PointerEvent as ReactPointerEvent, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Task } from "@/types/task";
import type { CanvasTool, WhiteboardRecord } from "@/types/whiteboard";

type Props = { userId: string; userEmail: string; tasks: Task[]; initialBoards: WhiteboardRecord[] };
type Point = { x: number; y: number };

const colors = ["#171714", "#2f6feb", "#16845b", "#d97706", "#c23b4a", "#7c3aed"];
const backgrounds = ["#ffffff", "#fffdf6", "#f6f8fa", "#f2fbf7", "#f8f5ff"];
const tools: { id: CanvasTool; label: string; icon: string }[] = [
  { id: "pen", label: "Pen", icon: "✎" },
  { id: "highlighter", label: "Highlighter", icon: "▰" },
  { id: "eraser", label: "Eraser", icon: "⌫" },
  { id: "line", label: "Line", icon: "╱" },
  { id: "arrow", label: "Arrow", icon: "→" },
  { id: "rectangle", label: "Rectangle", icon: "□" },
  { id: "ellipse", label: "Ellipse", icon: "○" },
  { id: "text", label: "Text", icon: "T" },
];

export function Whiteboard({ userId, userEmail, tasks, initialBoards }: Props) {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const drawing = useRef(false);
  const start = useRef<Point>({ x: 0, y: 0 });
  const beforeShape = useRef<ImageData | null>(null);
  const undoStack = useRef<string[]>([]);
  const redoStack = useRef<string[]>([]);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [tool, setTool] = useState<CanvasTool>("pen");
  const [color, setColor] = useState(colors[0]);
  const [size, setSize] = useState(4);
  const [background, setBackground] = useState(backgrounds[0]);
  const [showGrid, setShowGrid] = useState(true);
  const [zoom, setZoom] = useState(100);
  const [title, setTitle] = useState("Untitled board");
  const [linkedTaskId, setLinkedTaskId] = useState("");
  const [boards, setBoards] = useState(initialBoards);
  const [currentBoardId, setCurrentBoardId] = useState<string | null>(null);
  const [status, setStatus] = useState("Local autosave on");
  const [busy, setBusy] = useState(false);
  const [historyTick, setHistoryTick] = useState(0);

  const drawSnapshot = useCallback((snapshot: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const image = new Image();
    image.onload = () => {
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
    };
    image.src = snapshot;
  }, []);

  const snapshot = useCallback(() => canvasRef.current?.toDataURL("image/png") ?? "", []);

  const scheduleLocalSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const data = snapshot();
      if (!data) return;
      localStorage.setItem(`livetask-board:${userId}`, JSON.stringify({ title, background, linkedTaskId, data }));
      setStatus("Saved locally");
    }, 650);
  }, [background, linkedTaskId, snapshot, title, userId]);

  const pushHistory = useCallback(() => {
    const data = snapshot();
    if (!data) return;
    undoStack.current.push(data);
    if (undoStack.current.length > 40) undoStack.current.shift();
    redoStack.current = [];
    setHistoryTick((value) => value + 1);
  }, [snapshot]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    if (!canvas || !stage) return;
    const resize = () => {
      const old = canvas.width ? canvas.toDataURL("image/png") : "";
      const rect = stage.getBoundingClientRect();
      canvas.width = Math.max(900, Math.floor(rect.width * devicePixelRatio));
      canvas.height = Math.max(620, Math.floor(rect.height * devicePixelRatio));
      canvas.style.width = `${Math.max(900, rect.width)}px`;
      canvas.style.height = `${Math.max(620, rect.height)}px`;
      if (old) drawSnapshot(old);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(stage);
    return () => observer.disconnect();
  }, [drawSnapshot]);

  useEffect(() => {
    const stored = localStorage.getItem(`livetask-board:${userId}`);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as { title?: string; background?: string; linkedTaskId?: string; data?: string };
      if (parsed.title) setTitle(parsed.title);
      if (parsed.background) setBackground(parsed.background);
      if (parsed.linkedTaskId) setLinkedTaskId(parsed.linkedTaskId);
      if (parsed.data) setTimeout(() => drawSnapshot(parsed.data!), 80);
    } catch { /* ignore invalid local data */ }
  }, [drawSnapshot, userId]);

  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current); }, []);

  function point(event: ReactPointerEvent<HTMLCanvasElement>): Point {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (canvas.width / rect.width),
      y: (event.clientY - rect.top) * (canvas.height / rect.height),
    };
  }

  function configure(context: CanvasRenderingContext2D) {
    const ratio = devicePixelRatio;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.lineWidth = size * ratio;
    context.strokeStyle = color;
    context.fillStyle = color;
    context.globalAlpha = tool === "highlighter" ? .28 : 1;
    context.globalCompositeOperation = tool === "eraser" ? "destination-out" : "source-over";
  }

  function pointerDown(event: ReactPointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    canvas.setPointerCapture(event.pointerId);
    pushHistory();
    drawing.current = true;
    start.current = point(event);
    beforeShape.current = context.getImageData(0, 0, canvas.width, canvas.height);
    configure(context);

    if (tool === "text") {
      const value = window.prompt("Text to place on the board:");
      drawing.current = false;
      if (!value) return;
      context.globalAlpha = 1;
      context.globalCompositeOperation = "source-over";
      context.font = `${Math.max(18, size * 5) * devicePixelRatio}px Inter, sans-serif`;
      context.textBaseline = "top";
      context.fillText(value.slice(0, 120), start.current.x, start.current.y);
      scheduleLocalSave();
      return;
    }

    if (["pen", "highlighter", "eraser"].includes(tool)) {
      context.beginPath();
      context.moveTo(start.current.x, start.current.y);
    }
  }

  function pointerMove(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    const current = point(event);
    configure(context);

    if (["pen", "highlighter", "eraser"].includes(tool)) {
      context.lineTo(current.x, current.y);
      context.stroke();
      return;
    }

    if (beforeShape.current) context.putImageData(beforeShape.current, 0, 0);
    context.beginPath();
    const width = current.x - start.current.x;
    const height = current.y - start.current.y;
    if (tool === "line") {
      context.moveTo(start.current.x, start.current.y);
      context.lineTo(current.x, current.y);
    } else if (tool === "rectangle") {
      context.rect(start.current.x, start.current.y, width, height);
    } else if (tool === "ellipse") {
      context.ellipse(start.current.x + width / 2, start.current.y + height / 2, Math.abs(width / 2), Math.abs(height / 2), 0, 0, Math.PI * 2);
    } else if (tool === "arrow") {
      drawArrow(context, start.current, current, size * devicePixelRatio);
    }
    context.stroke();
  }

  function pointerUp(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    drawing.current = false;
    canvasRef.current?.releasePointerCapture(event.pointerId);
    const context = canvasRef.current?.getContext("2d");
    if (context) { context.globalAlpha = 1; context.globalCompositeOperation = "source-over"; }
    scheduleLocalSave();
  }

  function undo() {
    const previous = undoStack.current.pop();
    if (!previous) return;
    redoStack.current.push(snapshot());
    drawSnapshot(previous);
    setHistoryTick((value) => value + 1);
    scheduleLocalSave();
  }

  function redo() {
    const next = redoStack.current.pop();
    if (!next) return;
    undoStack.current.push(snapshot());
    drawSnapshot(next);
    setHistoryTick((value) => value + 1);
    scheduleLocalSave();
  }

  function clearBoard() {
    if (!window.confirm("Clear everything on this board?")) return;
    pushHistory();
    const canvas = canvasRef.current;
    canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    scheduleLocalSave();
  }

  function downloadBoard() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = canvas.width;
    exportCanvas.height = canvas.height;
    const context = exportCanvas.getContext("2d")!;
    context.fillStyle = background;
    context.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
    context.drawImage(canvas, 0, 0);
    const link = document.createElement("a");
    link.download = `${title.trim().replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "whiteboard"}.png`;
    link.href = exportCanvas.toDataURL("image/png");
    link.click();
  }

  function importImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const canvas = canvasRef.current;
        const context = canvas?.getContext("2d");
        if (!canvas || !context) return;
        pushHistory();
        const scale = Math.min(canvas.width / image.width, canvas.height / image.height, 1);
        context.drawImage(image, 40, 40, image.width * scale, image.height * scale);
        scheduleLocalSave();
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  }

  async function saveCloud() {
    const data = snapshot();
    if (!data || !title.trim()) return;
    setBusy(true);
    setStatus("Saving to cloud…");
    const supabase = createClient();
    const payload = { user_id: userId, title: title.trim(), snapshot: data, background, linked_task_id: linkedTaskId || null };
    const request = currentBoardId
      ? supabase.from("whiteboards").update(payload).eq("id", currentBoardId).eq("user_id", userId).select("*").single()
      : supabase.from("whiteboards").insert(payload).select("*").single();
    const { data: saved, error } = await request;
    if (error) setStatus(error.message);
    else {
      const board = saved as WhiteboardRecord;
      setCurrentBoardId(board.id);
      setBoards((current) => [board, ...current.filter((item) => item.id !== board.id)]);
      setStatus("Saved to cloud");
    }
    setBusy(false);
  }

  function loadBoard(board: WhiteboardRecord) {
    pushHistory();
    setCurrentBoardId(board.id);
    setTitle(board.title);
    setBackground(board.background);
    setLinkedTaskId(board.linked_task_id ?? "");
    drawSnapshot(board.snapshot);
    setStatus("Cloud board opened");
  }

  function newBoard() {
    setCurrentBoardId(null);
    setTitle("Untitled board");
    setLinkedTaskId("");
    clearWithoutConfirm();
    setStatus("New board");
  }

  function clearWithoutConfirm() {
    pushHistory();
    const canvas = canvasRef.current;
    canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    scheduleLocalSave();
  }

  async function deleteBoard(board: WhiteboardRecord) {
    if (!window.confirm(`Delete “${board.title}”?`)) return;
    const supabase = createClient();
    const { error } = await supabase.from("whiteboards").delete().eq("id", board.id).eq("user_id", userId);
    if (error) { setStatus(error.message); return; }
    setBoards((current) => current.filter((item) => item.id !== board.id));
    if (currentBoardId === board.id) newBoard();
  }

  async function signOut() {
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <main className="dashboard-shell canvas-shell">
      <aside className="dashboard-sidebar">
        <Link href="/dashboard" className="brand dashboard-brand"><span className="brand-mark">LT</span><span>LiveTask</span></Link>
        <nav className="side-nav" aria-label="Workspace navigation">
          <Link className="side-link" href="/dashboard"><span>▦</span> My tasks</Link>
          <Link className="side-link active" href="/canvas"><span>✎</span> Canvas</Link>
        </nav>
        <div className="board-library">
          <div className="library-title"><span>Saved boards</span><button type="button" onClick={newBoard}>+</button></div>
          <div className="library-list">
            {boards.length === 0 && <p>No cloud boards yet.</p>}
            {boards.map((board) => (
              <div className={`library-item ${board.id === currentBoardId ? "active" : ""}`} key={board.id}>
                <button type="button" onClick={() => loadBoard(board)}><strong>{board.title}</strong><span>{formatDate(board.updated_at)}</span></button>
                <button type="button" className="library-delete" onClick={() => deleteBoard(board)} aria-label={`Delete ${board.title}`}>×</button>
              </div>
            ))}
          </div>
        </div>
        <div className="sidebar-user">
          <div className="avatar">{userEmail.slice(0, 2).toUpperCase()}</div>
          <div><strong>{userEmail.split("@")[0]}</strong><span>{userEmail}</span></div>
          <button type="button" onClick={signOut} aria-label="Sign out">↗</button>
        </div>
      </aside>

      <section className="canvas-content">
        <header className="canvas-header">
          <div className="canvas-title-group">
            <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={80} aria-label="Board title" />
            <span>{status}</span>
          </div>
          <div className="canvas-header-actions">
            <button className="button button-secondary" type="button" onClick={newBoard}>New</button>
            <button className="button button-secondary" type="button" onClick={downloadBoard}>Export PNG</button>
            <button className="button button-primary" type="button" onClick={saveCloud} disabled={busy}>{busy ? "Saving…" : currentBoardId ? "Update board" : "Save board"}</button>
          </div>
        </header>

        <div className="canvas-toolbar" role="toolbar" aria-label="Drawing tools">
          <div className="tool-group tool-list">
            {tools.map((item) => <button key={item.id} type="button" className={tool === item.id ? "active" : ""} onClick={() => setTool(item.id)} title={item.label}><span>{item.icon}</span><small>{item.label}</small></button>)}
          </div>
          <div className="toolbar-divider" />
          <div className="tool-group color-list">
            {colors.map((item) => <button key={item} type="button" className={color === item ? "active" : ""} style={{ background: item }} onClick={() => setColor(item)} aria-label={`Use ${item}`} />)}
            <input type="color" value={color} onChange={(event) => setColor(event.target.value)} aria-label="Custom color" />
          </div>
          <label className="range-control">Size <input type="range" min="1" max="32" value={size} onChange={(event) => setSize(Number(event.target.value))} /><span>{size}</span></label>
          <div className="toolbar-divider" />
          <div className="tool-group compact-tools">
            <button type="button" onClick={undo} disabled={undoStack.current.length === 0} title="Undo">↶</button>
            <button type="button" onClick={redo} disabled={redoStack.current.length === 0} title="Redo">↷</button>
            <button type="button" onClick={() => fileRef.current?.click()} title="Import image">＋ Image</button>
            <button type="button" onClick={() => setShowGrid((value) => !value)} className={showGrid ? "active" : ""}>Grid</button>
            <button type="button" onClick={clearBoard} className="danger-text">Clear</button>
          </div>
          <input ref={fileRef} hidden type="file" accept="image/*" onChange={importImage} />
        </div>

        <div className="canvas-options">
          <label>Background <span className="background-picks">{backgrounds.map((item) => <button key={item} type="button" onClick={() => setBackground(item)} className={background === item ? "active" : ""} style={{ background: item }} />)}</span></label>
          <label>Linked task <select value={linkedTaskId} onChange={(event) => setLinkedTaskId(event.target.value)}><option value="">None</option>{tasks.map((task) => <option value={task.id} key={task.id}>{task.title}</option>)}</select></label>
          <label>Zoom <input type="range" min="60" max="160" step="10" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} /><span>{zoom}%</span></label>
        </div>

        <div className="canvas-viewport">
          <div ref={stageRef} className={`canvas-stage ${showGrid ? "show-grid" : ""}`} style={{ background, transform: `scale(${zoom / 100})` }}>
            <canvas ref={canvasRef} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp} />
          </div>
        </div>
        <p className="canvas-tip">Tip: use Pen for notes, Highlighter for emphasis, shapes for diagrams, Text for labels, and save important boards to your private cloud workspace.</p>
        <span className="history-sentinel" aria-hidden="true">{historyTick}</span>
      </section>
    </main>
  );
}

function drawArrow(context: CanvasRenderingContext2D, from: Point, to: Point, size: number) {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const head = Math.max(12 * devicePixelRatio, size * 4);
  context.moveTo(from.x, from.y);
  context.lineTo(to.x, to.y);
  context.moveTo(to.x, to.y);
  context.lineTo(to.x - head * Math.cos(angle - Math.PI / 6), to.y - head * Math.sin(angle - Math.PI / 6));
  context.moveTo(to.x, to.y);
  context.lineTo(to.x - head * Math.cos(angle + Math.PI / 6), to.y - head * Math.sin(angle + Math.PI / 6));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { day: "2-digit", month: "short" }).format(new Date(value));
}
