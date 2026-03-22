import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { useSidebar } from '../SidebarContext';
import { RefreshCw, Send, Network, Users, Link2, Info } from 'lucide-react';

// ─── Event log icons ──────────────────────────────────────────────────────────
const EVENT_ICONS = {
	stage: '⚙️',
	agent: '🤖',
	action: '📝',
	round: '🔄',
	error: '❌',
	done: '✅',
};

// ─── Graph node colours by entity type ───────────────────────────────────────
const TYPE_COLOR = {
	PERSON: '#2563eb',
	ORGANIZATION: '#506071',
	LOCATION: '#2d6a4f',
	EVENT: '#7c3aed',
};

// ─── Tab bar ──────────────────────────────────────────────────────────────────
function Tabs({ tabs, active, onChange }) {
	return (
		<div
			style={{
				display: 'flex',
				gap: '0.2rem',
				background: '#f5ede4',
				borderRadius: '10px',
				padding: '0.25rem',
			}}
		>
			{tabs.map((t) => (
				<button
					key={t.id}
					onClick={() => onChange(t.id)}
					style={{
						flex: 1,
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						gap: '0.3rem',
						padding: '0.45rem 0.5rem',
						borderRadius: '7px',
						fontSize: '0.8rem',
						fontWeight: 600,
						cursor: 'pointer',
						border: 'none',
						background: active === t.id ? '#fff' : 'transparent',
						color:
							active === t.id
								? 'var(--accent-color)'
								: 'var(--text-secondary)',
						boxShadow:
							active === t.id
								? '0 1px 4px rgba(0,0,0,0.08)'
								: 'none',
						transition: 'all 0.15s',
					}}
				>
					{t.icon}
					{t.label}
				</button>
			))}
		</div>
	);
}

// ─── Force-directed graph ─────────────────────────────────────────────────────
function ForceGraph({ agents, graph }) {
	const canvasRef = useRef(null);
	const containerRef = useRef(null);
	const animRef = useRef(null);
	const nodesRef = useRef([]);
	const transRef = useRef({ x: 0, y: 0, scale: 1 });
	const dragRef = useRef(null);
	const [hovered, setHovered] = useState(null);

	useEffect(() => {
		const canvas = canvasRef.current;
		const container = containerRef.current;
		if (!canvas || !container) return;

		const dpr = window.devicePixelRatio || 1;
		const W = container.offsetWidth || 600;
		const H = 460;
		canvas.width = W * dpr;
		canvas.height = H * dpr;
		canvas.style.width = W + 'px';
		canvas.style.height = H + 'px';

		const entities = graph?.entities || {};
		const relations = graph?.relations || [];

		const ctx = canvas.getContext('2d');
		ctx.scale(dpr, dpr);

		const nodeMap = {};
		agents.forEach((a) => {
			nodeMap[a.realname] = {
				id: a.realname,
				label:
					(a.username || a.realname).length > 16
						? (a.username || a.realname).slice(0, 14) + '…'
						: a.username || a.realname,
				fullLabel: a.realname,
				detail: `@${a.username} · ${a.profession || ''}`,
				isAgent: true,
				color: '#12283c',
				r: 20,
				x: W / 2 + (Math.random() - 0.5) * W * 0.45,
				y: H / 2 + (Math.random() - 0.5) * H * 0.45,
				vx: 0,
				vy: 0,
			};
		});

		const inRelation = new Set();
		relations.forEach((r) => {
			inRelation.add(r.source);
			inRelation.add(r.target);
		});

		Object.entries(entities).forEach(([name, data]) => {
			if (!nodeMap[name] && inRelation.has(name)) {
				const type = (data.type || '').toUpperCase();
				nodeMap[name] = {
					id: name,
					label: name.length > 16 ? name.slice(0, 14) + '…' : name,
					fullLabel: name,
					detail: type,
					isAgent: false,
					color: TYPE_COLOR[type] || '#74777d',
					r: 13,
					x: W / 2 + (Math.random() - 0.5) * W * 0.5,
					y: H / 2 + (Math.random() - 0.5) * H * 0.5,
					vx: 0,
					vy: 0,
				};
			}
		});

		const nodes = Object.values(nodeMap);
		nodesRef.current = nodes;
		const idx = {};
		nodes.forEach((n, i) => {
			idx[n.id] = i;
		});

		const edges = relations
			.filter(
				(r) =>
					idx[r.source] !== undefined && idx[r.target] !== undefined,
			)
			.map((r) => ({
				si: idx[r.source],
				ti: idx[r.target],
				type: r.type,
			}));

		const seen = new Set();
		const drawEdges = edges.filter((e) => {
			const key = `${Math.min(e.si, e.ti)}-${Math.max(e.si, e.ti)}`;
			if (seen.has(key)) return false;
			seen.add(key);
			return true;
		});

		let frame = 0;

		function simulate() {
			const REPULSION = 4200,
				SPRING_LEN = 140,
				SPRING_K = 0.028,
				DAMPING = 0.82,
				GRAVITY = 0.01;
			for (let i = 0; i < nodes.length; i++) {
				for (let j = i + 1; j < nodes.length; j++) {
					const dx = nodes[j].x - nodes[i].x,
						dy = nodes[j].y - nodes[i].y;
					const d2 = Math.max(dx * dx + dy * dy, 0.01),
						d = Math.sqrt(d2);
					const f = REPULSION / d2,
						fx = (dx / d) * f,
						fy = (dy / d) * f;
					nodes[i].vx -= fx;
					nodes[i].vy -= fy;
					nodes[j].vx += fx;
					nodes[j].vy += fy;
				}
			}
			edges.forEach((e) => {
				const n1 = nodes[e.si],
					n2 = nodes[e.ti];
				const dx = n2.x - n1.x,
					dy = n2.y - n1.y,
					d = Math.sqrt(dx * dx + dy * dy) || 0.01;
				const f = (d - SPRING_LEN) * SPRING_K,
					fx = (dx / d) * f,
					fy = (dy / d) * f;
				n1.vx += fx;
				n1.vy += fy;
				n2.vx -= fx;
				n2.vy -= fy;
			});
			nodes.forEach((n) => {
				n.vx += (W / 2 - n.x) * GRAVITY;
				n.vy += (H / 2 - n.y) * GRAVITY;
				n.vx *= DAMPING;
				n.vy *= DAMPING;
				n.x = Math.max(n.r + 6, Math.min(W - n.r - 6, n.x + n.vx));
				n.y = Math.max(n.r + 6, Math.min(H - n.r - 6, n.y + n.vy));
			});
		}

		function draw() {
			const t = transRef.current;
			ctx.clearRect(0, 0, W, H);

			ctx.save();
			ctx.translate(t.x, t.y);
			ctx.scale(t.scale, t.scale);

			// edges
			drawEdges.forEach((e) => {
				const n1 = nodes[e.si],
					n2 = nodes[e.ti];
				ctx.beginPath();
				ctx.moveTo(n1.x, n1.y);
				ctx.lineTo(n2.x, n2.y);
				ctx.strokeStyle = 'rgba(18,40,60,0.18)';
				ctx.lineWidth = 1.5;
				ctx.stroke();

				// edge label
				if (drawEdges.length <= 22 && e.type) {
					const mx = (n1.x + n2.x) / 2;
					const my = (n1.y + n2.y) / 2;
					const label =
						e.type.length > 16 ? e.type.slice(0, 14) + '…' : e.type;
					ctx.font = '600 10px Inter,system-ui,sans-serif';
					const tw = ctx.measureText(label).width;
					// pill background
					const pad = 5;
					ctx.fillStyle = 'rgba(255,255,255,0.96)';
					ctx.beginPath();
					ctx.roundRect(
						mx - tw / 2 - pad,
						my - 7,
						tw + pad * 2,
						14,
						4,
					);
					ctx.fill();
					ctx.strokeStyle = 'rgba(18,40,60,0.12)';
					ctx.lineWidth = 0.5;
					ctx.stroke();
					ctx.fillStyle = '#43474c';
					ctx.textAlign = 'center';
					ctx.textBaseline = 'middle';
					ctx.fillText(label, mx, my);
				}
			});

			// nodes
			nodes.forEach((n) => {
				// drop shadow
				ctx.shadowColor = 'rgba(25,28,28,0.16)';
				ctx.shadowBlur = 10;
				ctx.shadowOffsetY = 3;

				// flat node circle
				ctx.beginPath();
				ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
				ctx.fillStyle = n.color;
				ctx.fill();

				ctx.shadowBlur = 0;
				ctx.shadowOffsetY = 0;

				// subtle inner highlight ring
				ctx.strokeStyle = 'rgba(255,255,255,0.35)';
				ctx.lineWidth = n.isAgent ? 2 : 1.5;
				ctx.stroke();

				// label below node
				const fontSize = n.isAgent ? 12 : 11;
				ctx.font = n.isAgent
					? `bold ${fontSize}px Inter,system-ui,sans-serif`
					: `600 ${fontSize}px Inter,system-ui,sans-serif`;
				ctx.textAlign = 'center';
				ctx.textBaseline = 'top';
				const labelY = n.y + n.r + 4;
				ctx.fillStyle = n.isAgent ? '#12283c' : '#43474c';
				ctx.fillText(n.label, n.x, labelY);
			});

			ctx.restore();
		}

		function onWheel(e) {
			e.preventDefault();
			const rect = canvas.getBoundingClientRect();
			const mx = e.clientX - rect.left;
			const my = e.clientY - rect.top;
			const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
			const t = transRef.current;
			const newScale = Math.max(0.15, Math.min(6, t.scale * factor));
			const sf = newScale / t.scale;
			transRef.current = {
				x: mx - sf * (mx - t.x),
				y: my - sf * (my - t.y),
				scale: newScale,
			};
		}

		function tick() {
			if (frame < 620) simulate();
			draw();
			frame++;
			animRef.current = requestAnimationFrame(tick);
		}
		animRef.current = requestAnimationFrame(tick);
		canvas.addEventListener('wheel', onWheel, { passive: false });
		return () => {
			cancelAnimationFrame(animRef.current);
			canvas.removeEventListener('wheel', onWheel);
		};
	}, [agents.length, graph]);

	const handleMouseDown = (e) => {
		if (e.button !== 0) return;
		const canvas = canvasRef.current;
		if (!canvas) return;
		const rect = canvas.getBoundingClientRect();
		dragRef.current = {
			startX: e.clientX - rect.left,
			startY: e.clientY - rect.top,
			startTx: transRef.current.x,
			startTy: transRef.current.y,
		};
		canvas.style.cursor = 'grabbing';
	};

	const handleMouseUp = () => {
		dragRef.current = null;
		if (canvasRef.current) canvasRef.current.style.cursor = 'grab';
	};

	const handleMouseMove = (e) => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const rect = canvas.getBoundingClientRect();
		const mx = e.clientX - rect.left;
		const my = e.clientY - rect.top;

		if (dragRef.current) {
			const dx = mx - dragRef.current.startX;
			const dy = my - dragRef.current.startY;
			transRef.current = {
				...transRef.current,
				x: dragRef.current.startTx + dx,
				y: dragRef.current.startTy + dy,
			};
			return;
		}

		// convert to world space for hover detection
		const t = transRef.current;
		const wx = (mx - t.x) / t.scale;
		const wy = (my - t.y) / t.scale;
		setHovered(
			nodesRef.current.find(
				(n) => Math.sqrt((n.x - wx) ** 2 + (n.y - wy) ** 2) <= n.r + 8,
			) || null,
		);
	};

	const zoom = (factor) => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const t = transRef.current;
		const cx = canvas.offsetWidth / 2;
		const cy = canvas.offsetHeight / 2;
		const newScale = Math.max(0.15, Math.min(6, t.scale * factor));
		const sf = newScale / t.scale;
		transRef.current = {
			x: cx - sf * (cx - t.x),
			y: cy - sf * (cy - t.y),
			scale: newScale,
		};
	};

	const resetView = () => {
		transRef.current = { x: 0, y: 0, scale: 1 };
	};

	return (
		<div
			ref={containerRef}
			style={{
				position: 'relative',
				borderRadius: '12px',
				overflow: 'hidden',
			}}
		>
			<canvas
				ref={canvasRef}
				style={{
					display: 'block',
					width: '100%',
					height: '460px',
					cursor: 'grab',
				}}
				onMouseDown={handleMouseDown}
				onMouseUp={handleMouseUp}
				onMouseMove={handleMouseMove}
				onMouseLeave={() => {
					setHovered(null);
					dragRef.current = null;
					if (canvasRef.current)
						canvasRef.current.style.cursor = 'grab';
				}}
				onDoubleClick={resetView}
			/>
			<div
				style={{
					position: 'absolute',
					top: 10,
					right: 10,
					background: 'rgba(255,255,255,0.96)',
					border: '1px solid #e7e8e8',
					borderRadius: '9px',
					padding: '0.55rem 0.75rem',
					fontSize: '0.72rem',
					display: 'flex',
					flexDirection: 'column',
					gap: 5,
					boxShadow: '0 2px 8px rgba(25,28,28,0.08)',
				}}
			>
				{[
					['#12283c', 'Agent'],
					['#2563eb', 'Person'],
					['#506071', 'Org'],
					['#2d6a4f', 'Location'],
					['#7c3aed', 'Event'],
				].map(([c, l]) => (
					<div
						key={l}
						style={{
							display: 'flex',
							alignItems: 'center',
							gap: 7,
							color: '#43474c',
							fontWeight: 500,
						}}
					>
						<div
							style={{
								width: 10,
								height: 10,
								borderRadius: '50%',
								background: c,
								flexShrink: 0,
							}}
						/>
						{l}
					</div>
				))}
			</div>
			{/* ── Zoom / pan controls ── */}
			<div
				style={{
					position: 'absolute',
					bottom: 10,
					right: 10,
					display: 'flex',
					flexDirection: 'column',
					gap: 4,
				}}
			>
				{[
					['+', 'Zoom in', () => zoom(1.25)],
					['−', 'Zoom out', () => zoom(1 / 1.25)],
					['⊙', 'Reset view (double-click)', resetView],
				].map(([label, title, fn]) => (
					<button
						key={label}
						title={title}
						onClick={fn}
						style={{
							width: 28,
							height: 28,
							borderRadius: 6,
							border: '1px solid #e7e8e8',
							background: 'rgba(255,255,255,0.96)',
							color: '#12283c',
							cursor: 'pointer',
							fontSize: '0.88rem',
							fontWeight: 700,
							lineHeight: 1,
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							boxShadow: '0 1px 4px rgba(25,28,28,0.08)',
						}}
					>
						{label}
					</button>
				))}
			</div>
			{hovered && (
				<div
					style={{
						position: 'absolute',
						bottom: 110,
						left: 10,
						background: 'rgba(255,255,255,0.97)',
						border: '1px solid #e7e8e8',
						borderRadius: '8px',
						padding: '0.45rem 0.75rem',
						color: '#191c1c',
						fontSize: '0.78rem',
						maxWidth: 210,
						pointerEvents: 'none',
						boxShadow: '0 2px 8px rgba(25,28,28,0.10)',
					}}
				>
					<div style={{ fontWeight: 700, color: hovered.color }}>
						{hovered.fullLabel}
					</div>
					{hovered.detail && (
						<div
							style={{
								color: '#506071',
								marginTop: 2,
								fontSize: '0.71rem',
							}}
						>
							{hovered.detail}
						</div>
					)}
				</div>
			)}
		</div>
	);
}

// ─── Main view ────────────────────────────────────────────────────────────────
export default function SessionView() {
	const { id } = useParams();
	const navigate = useNavigate();
	const [session, setSession] = useState(null);
	const [messages, setMessages] = useState([]);
	const [query, setQuery] = useState('');
	const [loading, setLoading] = useState(true);
	const [chatLoading, setChatLoading] = useState(false);
	const [liveLog, setLiveLog] = useState([]);
	const [artifacts, setArtifacts] = useState({
		agents: [],
		graph: { entities: {}, relations: [] },
	});
	const [activeTab, setActiveTab] = useState('graph');
	const [dbEvents, setDbEvents] = useState([]);
	const messagesEndRef = useRef(null);
	const logEndRef = useRef(null);
	const { setSessionNav } = useSidebar();

	useEffect(() => {
		const agentCount = (artifacts.agents || []).length;
		const relationCount = ((artifacts.graph || {}).relations || []).length;
		setSessionNav({
			activeTab,
			setActiveTab,
			agentCount,
			relationCount,
			session,
		});
		return () => setSessionNav(null);
	}, [activeTab, artifacts, session]);

	useEffect(() => {
		fetchData();
		const interval = setInterval(() => {
			if (session?.status === 'running') fetchData(false);
		}, 5000);
		return () => clearInterval(interval);
	}, [id, session?.status]);

	useEffect(() => {
		if (session?.status !== 'running') return;
		const token = localStorage.getItem('token');
		const url = `http://localhost:8000/api/simulation/stream/${id}?token=${encodeURIComponent(token)}`;
		const es = new EventSource(url);
		es.onmessage = (e) => {
			try {
				const ev = JSON.parse(e.data);
				setLiveLog((prev) => [...prev, ev]);
				if (ev.type === 'done' || ev.type === 'error') es.close();
			} catch {
				/* noop */
			}
		};
		es.onerror = () => es.close();
		return () => es.close();
	}, [id, session?.status]);

	useEffect(() => {
		logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
	}, [liveLog]);
	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
	}, [messages]);

	const fetchData = async (showLoader = true) => {
		if (showLoader) setLoading(true);
		try {
			const res = await api.get(`/sessions/${id}`);
			setSession(res.data);
			if (res.data.status === 'completed') {
				const [chatRes, artRes] = await Promise.all([
					api.get(`/simulation/chat/${id}`),
					api.get(`/simulation/artifacts/${id}`),
				]);
				setMessages(chatRes.data || []);
				setArtifacts(
					artRes.data || {
						agents: [],
						graph: { entities: {}, relations: [] },
					},
				);
				// Fetch persisted simulation events
				try {
					const evRes = await api.get(`/simulation/events/${id}`);
					setDbEvents(evRes.data || []);
				} catch {
					/* non-fatal */
				}
			}
		} catch (err) {
			console.error(err);
		} finally {
			if (showLoader) setLoading(false);
		}
	};

	const handleChat = async (e) => {
		e.preventDefault();
		if (!query.trim()) return;
		const userQ = query;
		setQuery('');
		setMessages((prev) => [
			...prev,
			{ text: userQ, is_user: true, id: Date.now() },
		]);
		setChatLoading(true);
		try {
			const formData = new URLSearchParams();
			formData.append('query', userQ);
			const res = await api.post(`/simulation/chat/${id}`, formData, {
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
				},
			});
			setMessages((prev) => [...prev, res.data]);
		} catch (err) {
			console.error(err);
			alert('Error sending message');
		} finally {
			setChatLoading(false);
		}
	};

	if (loading)
		return (
			<div
				style={{
					textAlign: 'center',
					marginTop: '5rem',
					color: 'var(--text-secondary)',
				}}
			>
				<style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
				<RefreshCw
					size={28}
					style={{
						animation: 'spin 1.4s linear infinite',
						marginBottom: '1rem',
						color: 'var(--accent-color)',
					}}
				/>
				<p>Loading session…</p>
			</div>
		);
	if (!session)
		return (
			<div style={{ textAlign: 'center', marginTop: '4rem' }}>
				Session not found.
			</div>
		);

	const agents = artifacts.agents || [];
	const graph = artifacts.graph || { entities: {}, relations: [] };
	const relations = graph.relations || [];

	return (
		<div
			className="fade-in"
			style={{
				display: 'flex',
				flexDirection: 'column',
				gap: '1.25rem',
				height: '100%',
				overflow: 'hidden',
			}}
		>
			<style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>

			{/* ── Split body ── */}
			<div
				style={{
					display: 'flex',
					gap: '1.5rem',
					alignItems: 'stretch',
					flex: 1,
					minHeight: 0,
					overflow: 'hidden',
				}}
			>
				{/* LEFT PANEL */}
				<div
					style={{
						width: '42%',
						flexShrink: 0,
						display: 'flex',
						flexDirection: 'column',
						gap: '1rem',
						minHeight: 0,
						overflowY: 'auto',
					}}
				>
					{/* Running: live log */}
					{session.status === 'running' && (
						<div
							className="card"
							style={{
								padding: '1.25rem',
								flex: 1,
								display: 'flex',
								flexDirection: 'column',
							}}
						>
							<div
								style={{
									display: 'flex',
									alignItems: 'center',
									gap: '0.6rem',
									marginBottom: '0.85rem',
								}}
							>
								<RefreshCw
									size={15}
									color="var(--accent-color)"
									style={{
										animation: 'spin 2s linear infinite',
									}}
								/>
								<span
									style={{
										fontWeight: 600,
										fontSize: '0.88rem',
									}}
								>
									Simulation running…
								</span>
							</div>
							<div
								style={{
									background: 'var(--primary)',
									border: '1px solid var(--primary-container)',
									borderRadius: '8px',
									padding: '0.85rem',
									fontFamily: 'monospace',
									fontSize: '0.78rem',
									lineHeight: 1.65,
									flex: 1,
									overflowY: 'auto',
									color: 'var(--primary-fixed)',
								}}
							>
								{liveLog.length === 0 && (
									<span style={{ color: '#8c7c6c' }}>
										Waiting for events…
									</span>
								)}
								{liveLog.map((ev, i) => (
									<div
										key={i}
										style={{
											color:
												ev.type === 'error'
													? '#f87171'
													: ev.type === 'done'
														? '#4ade80'
														: ev.type === 'round'
															? '#fb923c'
															: ev.type ===
																  'agent'
																? '#c084fc'
																: '#d4c8bc',
											padding: '0.07rem 0',
										}}
									>
										<span
											style={{
												color: '#7c6c5c',
												marginRight: '0.35rem',
												userSelect: 'none',
											}}
										>
											›
										</span>
										<span style={{ marginRight: '0.3rem' }}>
											{EVENT_ICONS[ev.type] ?? '•'}
										</span>
										{ev.message}
									</div>
								))}
								<div ref={logEndRef} />
							</div>
						</div>
					)}

					{/* Error */}
					{session.status === 'error' && (
						<div
							style={{
								display: 'flex',
								flexDirection: 'column',
								alignItems: 'flex-start',
								gap: '1rem',
								padding: '1.25rem',
								background: 'rgba(220,38,38,0.07)',
								border: '1px solid rgba(220,38,38,0.2)',
								borderRadius: '8px',
								color: 'var(--danger-color)',
							}}
						>
							<span>
								Simulation failed. Check the backend logs for
								details.
							</span>
						</div>
					)}

					{session.status === 'completed' && (
						<div
							className="card"
							style={{
								padding: '1.25rem',
								display: 'flex',
								flexDirection: 'column',
								gap: '1rem',
								flex: 1,
								overflowY: 'auto',
							}}
						>
							{/* Graph */}
							{activeTab === 'graph' &&
								(agents.length === 0 ? (
									<div
										style={{
											textAlign: 'center',
											color: 'var(--text-secondary)',
											padding: '3rem 1rem',
										}}
									>
										No agent or graph data available.
									</div>
								) : (
									<ForceGraph
										agents={agents}
										graph={graph}
									/>
								))}

							{/* Agents */}
							{activeTab === 'agents' && (
								<div
									style={{
										display: 'flex',
										flexDirection: 'column',
										gap: '0.55rem',
										flex: 1,
										overflowY: 'auto',
										paddingRight: '0.2rem',
									}}
								>
									{agents.length === 0 && (
										<div
											style={{
												color: 'var(--text-secondary)',
												textAlign: 'center',
												padding: '2rem',
											}}
										>
											No agents found.
										</div>
									)}
									{agents.map((a, i) => (
										<div
											key={i}
											style={{
												display: 'flex',
												alignItems: 'center',
												gap: '0.75rem',
												padding: '0.6rem 0.75rem',
												background:
													'var(--surface-container-low)',
												borderRadius: '8px',
												border: '1px solid var(--outline-variant)',
											}}
										>
											<div
												style={{
													width: 36,
													height: 36,
													borderRadius: '50%',
													background:
														'var(--accent-color)',
													display: 'flex',
													alignItems: 'center',
													justifyContent: 'center',
													flexShrink: 0,
													color: '#fff',
													fontWeight: 700,
													fontSize: '0.88rem',
												}}
											>
												{(a.realname || '?')
													.charAt(0)
													.toUpperCase()}
											</div>
											<div style={{ minWidth: 0 }}>
												<div
													style={{
														fontWeight: 600,
														fontSize: '0.84rem',
														whiteSpace: 'nowrap',
														overflow: 'hidden',
														textOverflow:
															'ellipsis',
													}}
												>
													{a.realname}
												</div>
												<div
													style={{
														fontSize: '0.73rem',
														color: 'var(--text-secondary)',
													}}
												>
													@{a.username} ·{' '}
													{a.profession || 'Unknown'}
												</div>
											</div>
											<div
												style={{
													marginLeft: 'auto',
													fontSize: '0.7rem',
													color: 'var(--text-secondary)',
													flexShrink: 0,
												}}
											>
												{a.country}
											</div>
										</div>
									))}
								</div>
							)}

							{/* Relations */}
							{activeTab === 'relations' && (
								<div
									style={{
										display: 'flex',
										flexDirection: 'column',
										gap: '0.45rem',
										flex: 1,
										overflowY: 'auto',
										paddingRight: '0.2rem',
									}}
								>
									{relations.length === 0 && (
										<div
											style={{
												color: 'var(--text-secondary)',
												textAlign: 'center',
												padding: '2rem',
											}}
										>
											No relations found.
										</div>
									)}
									{relations.map((r, i) => (
										<div
											key={i}
											style={{
												display: 'flex',
												alignItems: 'center',
												gap: '0.5rem',
												fontSize: '0.78rem',
												padding: '0.4rem 0.65rem',
												background:
													'var(--surface-container-low)',
												borderRadius: '6px',
												border: '1px solid var(--outline-variant)',
											}}
										>
											<span
												style={{
													fontWeight: 600,
													flexShrink: 0,
													maxWidth: '32%',
													overflow: 'hidden',
													textOverflow: 'ellipsis',
													whiteSpace: 'nowrap',
												}}
											>
												{r.source}
											</span>
											<span
												style={{
													flex: 1,
													textAlign: 'center',
													color: 'var(--accent-color)',
													fontWeight: 700,
													fontSize: '0.63rem',
													textTransform: 'uppercase',
													letterSpacing: '0.04em',
													whiteSpace: 'nowrap',
												}}
											>
												{r.type}
											</span>
											<span
												style={{
													fontWeight: 600,
													flexShrink: 0,
													maxWidth: '32%',
													overflow: 'hidden',
													textOverflow: 'ellipsis',
													whiteSpace: 'nowrap',
													textAlign: 'right',
												}}
											>
												{r.target}
											</span>
										</div>
									))}
								</div>
							)}

							{/* Info */}
							{activeTab === 'info' && (
								<div
									style={{
										display: 'flex',
										flexDirection: 'column',
										gap: '0.85rem',
										flex: 1,
										overflowY: 'auto',
									}}
								>
									{/* Session metadata */}
									<div
										style={{
											background:
												'var(--surface-container-low)',
											border: '1px solid var(--outline-variant)',
											borderRadius: '8px',
											padding: '0.85rem',
											display: 'flex',
											flexDirection: 'column',
											gap: '0.55rem',
										}}
									>
										<div
											style={{
												display: 'flex',
												justifyContent: 'space-between',
												alignItems: 'center',
											}}
										>
											<span
												style={{
													fontSize: '0.73rem',
													color: 'var(--text-secondary)',
													fontWeight: 600,
												}}
											>
												Session ID
											</span>
											<span
												style={{
													fontSize: '0.73rem',
													fontFamily: 'monospace',
													wordBreak: 'break-all',
													textAlign: 'right',
													maxWidth: '65%',
												}}
											>
												{session.session_id}
											</span>
										</div>
										<div
											style={{
												display: 'flex',
												justifyContent: 'space-between',
												alignItems: 'center',
											}}
										>
											<span
												style={{
													fontSize: '0.73rem',
													color: 'var(--text-secondary)',
													fontWeight: 600,
												}}
											>
												Status
											</span>
											<span
												style={{
													padding: '0.2rem 0.6rem',
													borderRadius: '10px',
													background:
														session.status ===
														'completed'
															? 'var(--success-color)'
															: session.status ===
																  'running'
																? 'var(--accent-color)'
																: 'var(--danger-color)',
													color: '#fff',
													fontSize: '0.68rem',
													fontWeight: 700,
													letterSpacing: '0.05em',
												}}
											>
												{session.status.toUpperCase()}
											</span>
										</div>
										<div
											style={{
												display: 'flex',
												justifyContent: 'space-between',
												alignItems: 'center',
											}}
										>
											<span
												style={{
													fontSize: '0.73rem',
													color: 'var(--text-secondary)',
													fontWeight: 600,
												}}
											>
												Created
											</span>
											<span
												style={{ fontSize: '0.73rem' }}
											>
												{new Date(
													session.created_at,
												).toLocaleString()}
											</span>
										</div>
									</div>

									{/* Logs */}
									<div
										style={{
											fontSize: '0.73rem',
											fontWeight: 600,
											color: 'var(--text-secondary)',
										}}
									>
										Event Log
									</div>
									<div
										style={{
											background: 'var(--primary)',
											border: '1px solid var(--primary-container)',
											borderRadius: '8px',
											padding: '0.85rem',
											fontFamily: 'monospace',
											fontSize: '0.78rem',
											lineHeight: 1.65,
											flex: 1,
											overflowY: 'auto',
											color: 'var(--primary-fixed)',
											minHeight: '8rem',
										}}
									>
										{(() => {
											const displayLog =
												dbEvents.length > 0
													? dbEvents
													: liveLog;
											return displayLog.length === 0 ? (
												<span
													style={{ color: '#8c7c6c' }}
												>
													No log entries.
												</span>
											) : (
												displayLog.map((ev, i) => (
													<div
														key={i}
														style={{
															color:
																ev.type ===
																'error'
																	? '#f87171'
																	: ev.type ===
																		  'done'
																		? '#4ade80'
																		: ev.type ===
																			  'round'
																			? '#fb923c'
																			: ev.type ===
																				  'agent'
																				? '#c084fc'
																				: '#d4c8bc',
															padding:
																'0.07rem 0',
														}}
													>
														<span
															style={{
																color: '#7c6c5c',
																marginRight:
																	'0.35rem',
																userSelect:
																	'none',
															}}
														>
															›
														</span>
														<span
															style={{
																marginRight:
																	'0.3rem',
															}}
														>
															{EVENT_ICONS[
																ev.type
															] ?? '•'}
														</span>
														{ev.message}
													</div>
												))
											);
										})()}
									</div>
								</div>
							)}
						</div>
					)}
				</div>

				{/* RIGHT PANEL: Chat */}
				<div
					style={{
						flex: 1,
						display: 'flex',
						flexDirection: 'column',
						gap: '0.6rem',
						minHeight: 0,
					}}
				>
					{session.status !== 'completed' ? (
						<div
							className="card"
							style={{
								textAlign: 'center',
								padding: '3rem 2rem',
								color: 'var(--text-secondary)',
							}}
						>
							{session.status === 'running' ? (
								<>
									<RefreshCw
										size={24}
										color="var(--accent-color)"
										style={{
											animation:
												'spin 2s linear infinite',
											marginBottom: '0.75rem',
										}}
									/>
									<p>
										Chat will be available once the
										simulation completes.
									</p>
								</>
							) : (
								<p>Simulation did not complete successfully.</p>
							)}
						</div>
					) : (
						<div
							style={{
								display: 'flex',
								flexDirection: 'column',
								flex: 1,
								minHeight: '480px',
								background: 'var(--surface-container-lowest)',
								border: '1px solid var(--outline-variant)',
								borderRadius: '12px',
								overflow: 'hidden',
							}}
						>
							<div
								style={{
									flex: 1,
									overflowY: 'auto',
									padding: '1.25rem',
									display: 'flex',
									flexDirection: 'column',
									gap: '1rem',
								}}
							>
								{messages.length === 0 && (
									<div
										style={{
											textAlign: 'center',
											color: 'var(--text-secondary)',
											marginTop: '4rem',
										}}
									>
										<div
											style={{
												fontSize: '2.5rem',
												marginBottom: '0.75rem',
											}}
										>
											💬
										</div>
										<p style={{ fontSize: '0.9rem' }}>
											Ask the Report Agent anything about
											this simulation.
										</p>
									</div>
								)}
								{messages.map((msg, idx) => (
									<div
										key={msg.id || idx}
										className={`chat-bubble ${msg.is_user ? 'user' : 'agent'}`}
									>
										<ReactMarkdown
											remarkPlugins={[remarkGfm]}
										>
											{msg.text}
										</ReactMarkdown>
									</div>
								))}
								{chatLoading && (
									<div
										className="chat-bubble agent"
										style={{
											display: 'flex',
											gap: '0.5rem',
											alignItems: 'center',
										}}
									>
										<RefreshCw
											size={14}
											style={{
												animation:
													'spin 1.4s linear infinite',
											}}
										/>{' '}
										Thinking…
									</div>
								)}
								<div ref={messagesEndRef} />
							</div>
							<form
								onSubmit={handleChat}
								style={{
									display: 'flex',
									gap: '0.5rem',
									padding: '0.85rem',
									borderTop:
										'1px solid var(--outline-variant)',
									background: 'var(--surface-container-low)',
								}}
							>
								<input
									className="input-field"
									value={query}
									onChange={(e) => setQuery(e.target.value)}
									placeholder="Ask a question about the simulation…"
									disabled={chatLoading}
									style={{ flex: 1 }}
								/>
								<button
									type="submit"
									className="btn"
									disabled={chatLoading}
									style={{ padding: '0.7rem', flexShrink: 0 }}
								>
									<Send size={18} />
								</button>
							</form>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
