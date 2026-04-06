import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
	X,
	MessageSquare,
	FileText,
	Send,
	Loader2,
	RotateCcw,
	Rss,
} from 'lucide-react';
import api from '../../api';
import SmallWorldReport from './SmallWorldReport';
import SWFeedPanel from './SWFeedPanel';
import ResimulateScenarioModal from './ResimulateScenarioModal';

const STATUS_COLOR = {
	idle: '#6366f1',
	running: '#f59e0b',
	completed: '#16a34a',
	failed: '#dc2626',
};
const EVENT_COLOR = {
	stage: '#818cf8',
	agent: '#34d399',
	action: '#f59e0b',
	round: '#60a5fa',
	error: '#f87171',
	done: '#4ade80',
	info: undefined,
	warning: '#fbbf24',
};

export default function ScenarioDetail({ worldId, scenario, onClose }) {
	const [tab, setTab] = useState('stream');
	const [events, setEvents] = useState([]);
	const [eventsLoading, setEventsLoading] = useState(false);
	const [liveStatus, setLiveStatus] = useState(scenario?.status);
	const [report, setReport] = useState(null);
	const [reportLoading, setReportLoading] = useState(false);
	const [chatMessages, setChatMessages] = useState([]);
	const [chatInput, setChatInput] = useState('');
	const [chatLoading, setChatLoading] = useState(false);
	const [streamKey, setStreamKey] = useState(0);
	const [showResimulateModal, setShowResimulateModal] = useState(false);
	const eventRef = useRef(null);
	const pollRef = useRef(null);
	const chatEndRef = useRef(null);

	const scenarioId = scenario?.scenario_id;

	useEffect(() => {
		setReport(null);
		setReportLoading(false);
	}, [scenarioId]);

	// ── Poll events via REST ──────────────────────────────────
	const fetchEvents = useCallback(async () => {
		if (!scenarioId || !worldId) return;
		try {
			const r = await api.get(
				`/small-world/worlds/${worldId}/scenarios/${scenarioId}/events`,
			);
			setEvents(r.data);
			if (r.data.length > 0) {
				const last = r.data[r.data.length - 1];
				if (last.type === 'done' || last.type === 'error') {
					setLiveStatus(last.type === 'done' ? 'completed' : 'error');
					clearInterval(pollRef.current);
				}
			}
		} catch {}
	}, [scenarioId, worldId]);

	useEffect(() => {
		if (!scenarioId || !worldId) return;
		setEvents([]);
		setEventsLoading(true);
		// Don't overwrite 'running' that was set by handleResimulate —
		// scenario prop status still reflects the previous run at this point.
		setLiveStatus((prev) =>
			prev === 'running' ? 'running' : scenario?.status,
		);

		fetchEvents().finally(() => setEventsLoading(false));

		// Always poll — self-terminates when 'done'/'error' event is received.
		// This covers both: initial load of a running scenario AND resimulate.
		clearInterval(pollRef.current);
		pollRef.current = setInterval(fetchEvents, 2000);

		return () => clearInterval(pollRef.current);
	}, [scenarioId, streamKey]);

	const handleResimulate = () => {
		if (liveStatus === 'running') return;
		setShowResimulateModal(true);
	};

	const handleResimulateSuccess = () => {
		setShowResimulateModal(false);
		setReport(null);
		setTab('stream');
		setLiveStatus('running');
		// streamKey bump triggers the useEffect which starts polling
		setStreamKey((k) => k + 1);
	};

	// Auto-scroll events
	useEffect(() => {
		eventRef.current?.scrollTo({
			top: eventRef.current.scrollHeight,
			behavior: 'smooth',
		});
	}, [events]);

	// Auto-scroll chat
	useEffect(() => {
		chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
	}, [chatMessages]);

	// Clear stale report as soon as a new run starts
	useEffect(() => {
		if (liveStatus === 'running') setReport(null);
	}, [liveStatus]);

	// Load report as soon as a completed scenario is loaded
	useEffect(() => {
		if (!scenarioId || !worldId) return;
		if (liveStatus !== 'completed') return;
		if (report) return;
		setReportLoading(true);
		api.get(`/small-world/worlds/${worldId}/scenarios/${scenarioId}/report`)
			.then((r) => {
				// {available: false} means report not generated yet — keep null
				setReport(r.data?.available === false ? null : r.data);
			})
			.catch(() => {})
			.finally(() => setReportLoading(false));
	}, [scenarioId, worldId, liveStatus, report]);

	// Load chat history
	useEffect(() => {
		if (tab !== 'chat' || !scenarioId || !worldId) return;
		api.get(`/small-world/worlds/${worldId}/scenarios/${scenarioId}/chat`)
			.then((r) => setChatMessages(r.data))
			.catch(() => {});
	}, [tab, scenarioId]);

	const sendChat = async () => {
		const text = chatInput.trim();
		if (!text || chatLoading) return;
		setChatInput('');
		setChatLoading(true);
		const userMsg = {
			is_user: true,
			text,
			timestamp: new Date().toISOString(),
		};
		setChatMessages((prev) => [...prev, userMsg]);
		try {
			const res = await api.post(
				`/small-world/worlds/${worldId}/scenarios/${scenarioId}/chat`,
				{ text },
			);
			setChatMessages((prev) => [...prev, res.data]);
		} catch {}
		setChatLoading(false);
	};

	if (!scenario) return null;

	const tabBtn = (key, label, Icon) => (
		<button
			onClick={() => setTab(key)}
			style={{
				display: 'flex',
				alignItems: 'center',
				gap: '0.3rem',
				padding: '0.45rem 0.9rem',
				border: 'none',
				borderRadius: '7px',
				fontSize: '0.82rem',
				fontWeight: tab === key ? 700 : 500,
				cursor: 'pointer',
				background:
					tab === key ? 'var(--secondary-container)' : 'transparent',
				color:
					tab === key
						? 'var(--on-secondary-container)'
						: 'var(--text-secondary)',
			}}
		>
			<Icon size={13} />
			{label}
		</button>
	);

	return (
		<>
			<div
				style={{
					position: 'fixed',
					top: 0,
					right: 0,
					height: '100vh',
					width: 480,
					background: 'var(--surface-container-lowest)',
					borderLeft: '1px solid var(--outline-variant)',
					zIndex: 200,
					display: 'flex',
					flexDirection: 'column',
					boxShadow: '-4px 0 24px rgba(0,0,0,0.12)',
				}}
			>
				{/* Header */}
				<div
					style={{
						padding: '1rem 1.2rem 0.7rem',
						borderBottom: '1px solid var(--outline-variant)',
						flexShrink: 0,
					}}
				>
					<div
						style={{
							display: 'flex',
							justifyContent: 'space-between',
							alignItems: 'flex-start',
						}}
					>
						<div>
							<h2
								style={{
									margin: 0,
									fontSize: '1rem',
									fontWeight: 700,
								}}
							>
								{scenario.name}
							</h2>
							<div
								style={{
									marginTop: 4,
									display: 'flex',
									alignItems: 'center',
									gap: '0.5rem',
								}}
							>
								<span
									style={{
										width: 8,
										height: 8,
										borderRadius: '50%',
										background:
											STATUS_COLOR[liveStatus] ||
											'#94a3b8',
										display: 'inline-block',
									}}
								/>
								<span
									style={{
										fontSize: '0.74rem',
										color: 'var(--text-secondary)',
										textTransform: 'capitalize',
									}}
								>
									{liveStatus || 'idle'}
								</span>
							</div>
						</div>
						<div
							style={{
								display: 'flex',
								alignItems: 'center',
								gap: '0.4rem',
							}}
						>
							<button
								onClick={handleResimulate}
								disabled={
									resimulating || liveStatus === 'running'
								}
								title="Resimulate"
								style={{
									display: 'flex',
									alignItems: 'center',
									gap: '0.3rem',
									padding: '0.35rem 0.7rem',
									background: 'var(--surface-container-high)',
									border: '1px solid var(--outline-variant)',
									borderRadius: '7px',
									fontSize: '0.78rem',
									fontWeight: 600,
									cursor:
										resimulating || liveStatus === 'running'
											? 'not-allowed'
											: 'pointer',
									color: 'var(--text-primary)',
									opacity:
										resimulating || liveStatus === 'running'
											? 0.5
											: 1,
								}}
							>
								<RotateCcw
									size={13}
									style={
										resimulating
											? {
													animation:
														'spin 1s linear infinite',
												}
											: {}
									}
								/>
								Resimulate
							</button>
							<button
								onClick={onClose}
								style={{
									background: 'none',
									border: 'none',
									cursor: 'pointer',
									color: 'var(--text-secondary)',
								}}
							>
								<X size={18} />
							</button>
						</div>
					</div>
					{scenario.seed_text && (
						<p
							style={{
								margin: '0.4rem 0 0',
								fontSize: '0.78rem',
								color: 'var(--text-secondary)',
								fontStyle: 'italic',
							}}
						>
							"{scenario.seed_text.slice(0, 120)}
							{scenario.seed_text.length > 120 ? '…' : ''}"
						</p>
					)}

					{/* Tabs */}
					<div
						style={{
							display: 'flex',
							gap: '0.25rem',
							marginTop: '0.75rem',
						}}
					>
						{tabBtn('stream', 'Live Feed', Loader2)}
						{tabBtn('feed', 'Agent Feed', Rss)}
						{tabBtn('report', 'Report', FileText)}
						{tabBtn('chat', 'Chat', MessageSquare)}
					</div>
				</div>

				{/* Body */}
				<div
					style={{
						flex: 1,
						overflow: 'hidden',
						display: 'flex',
						flexDirection: 'column',
					}}
				>
					{/* Stream tab */}
					{tab === 'stream' && (
						<div
							ref={eventRef}
							style={{
								flex: 1,
								overflowY: 'auto',
								padding: '0.75rem 1.2rem',
								fontFamily: 'monospace',
								fontSize: '0.78rem',
								lineHeight: 1.8,
							}}
						>
							{eventsLoading && events.length === 0 && (
								<div
									style={{
										display: 'flex',
										alignItems: 'center',
										gap: '0.5rem',
										color: 'var(--text-secondary)',
										fontFamily: 'inherit',
									}}
								>
									<Loader2
										size={13}
										style={{
											animation:
												'spin 1s linear infinite',
										}}
									/>
									Loading events…
								</div>
							)}
							{!eventsLoading && events.length === 0 && (
								<p
									style={{
										color: 'var(--text-secondary)',
										fontFamily: 'inherit',
									}}
								>
									{liveStatus === 'running'
										? 'Waiting for simulation events…'
										: 'No events recorded for this scenario.'}
								</p>
							)}
							{events.map((e) => (
								<div
									key={e.id}
									style={{
										marginBottom: '0.2rem',
										display: 'flex',
										gap: '0.6rem',
										alignItems: 'baseline',
									}}
								>
									<span
										style={{
											flexShrink: 0,
											fontSize: '0.7rem',
											fontWeight: 700,
											textTransform: 'uppercase',
											color:
												EVENT_COLOR[e.type] ||
												'#94a3b8',
											minWidth: '3.5rem',
										}}
									>
										{e.type}
									</span>
									<span
										style={{
											color:
												e.type === 'error'
													? '#f87171'
													: 'var(--text-primary)',
											wordBreak: 'break-word',
										}}
									>
										{e.message}
									</span>
									<span
										style={{
											marginLeft: 'auto',
											flexShrink: 0,
											color: '#64748b',
											fontSize: '0.68rem',
										}}
									>
										{e.timestamp
											? new Date(
													e.timestamp,
												).toLocaleTimeString()
											: ''}
									</span>
								</div>
							))}
							{(liveStatus === 'completed' ||
								liveStatus === 'error') &&
								events.length > 0 && (
									<div
										style={{
											color:
												liveStatus === 'error'
													? '#f87171'
													: '#4ade80',
											fontWeight: 700,
											marginTop: '0.75rem',
											paddingTop: '0.5rem',
											borderTop:
												'1px solid var(--outline-variant)',
										}}
									>
										{liveStatus === 'error'
											? '— Simulation failed —'
											: '— Simulation complete —'}
									</div>
								)}
							{(liveStatus === 'running' ||
								liveStatus === 'created') && (
								<div
									style={{
										display: 'flex',
										alignItems: 'center',
										gap: '0.4rem',
										color: '#f59e0b',
										marginTop: '0.4rem',
										fontSize: '0.75rem',
									}}
								>
									<Loader2
										size={12}
										style={{
											animation:
												'spin 1s linear infinite',
										}}
									/>
									Running…
								</div>
							)}
						</div>
					)}

					{/* Agent Feed tab */}
					{tab === 'feed' && (
						<SWFeedPanel
							key={`${scenarioId}-${liveStatus}`}
							worldId={worldId}
							scenarioId={scenarioId}
							liveStatus={liveStatus}
						/>
					)}

					{/* Report tab */}
					{tab === 'report' && (
						<div
							style={{
								flex: 1,
								overflowY: 'auto',
								padding: '0.9rem 1.2rem',
							}}
						>
							{liveStatus === 'running' ||
							liveStatus === 'created' ? (
								<div
									style={{
										display: 'flex',
										alignItems: 'center',
										gap: '0.5rem',
										color: 'var(--text-secondary)',
										fontSize: '0.85rem',
									}}
								>
									<Loader2
										size={15}
										style={{
											animation:
												'spin 1s linear infinite',
										}}
									/>
									Simulation is still running. Report will
									appear when it completes.
								</div>
							) : reportLoading ? (
								<div
									style={{
										display: 'flex',
										alignItems: 'center',
										gap: '0.5rem',
										color: 'var(--text-secondary)',
										fontSize: '0.85rem',
									}}
								>
									<Loader2
										size={15}
										style={{
											animation:
												'spin 1s linear infinite',
										}}
									/>{' '}
									Loading report…
								</div>
							) : report ? (
								<SmallWorldReport report={report} />
							) : (
								<p
									style={{
										color: 'var(--text-secondary)',
										fontSize: '0.88rem',
									}}
								>
									{liveStatus === 'completed'
										? 'Report not available for this scenario.'
										: 'Report will be available once the simulation completes.'}
								</p>
							)}
						</div>
					)}

					{/* Chat tab */}
					{tab === 'chat' && (
						<>
							<div
								style={{
									flex: 1,
									overflowY: 'auto',
									padding: '0.75rem 1.2rem',
									display: 'flex',
									flexDirection: 'column',
									gap: '0.55rem',
								}}
							>
								{chatMessages.length === 0 && (
									<p
										style={{
											color: 'var(--text-secondary)',
											fontSize: '0.84rem',
										}}
									>
										Ask questions about this scenario's
										outcomes…
									</p>
								)}
								{chatMessages.map((m, i) => (
									<div
										key={i}
										style={{
											display: 'flex',
											justifyContent: m.is_user
												? 'flex-end'
												: 'flex-start',
										}}
									>
										<div
											style={{
												maxWidth: '80%',
												padding: '0.5rem 0.8rem',
												borderRadius: m.is_user
													? '12px 12px 2px 12px'
													: '12px 12px 12px 2px',
												background: m.is_user
													? 'var(--accent-color)'
													: 'var(--surface-container-high)',
												color: m.is_user
													? '#fff'
													: 'var(--text-primary)',
												fontSize: '0.84rem',
												lineHeight: 1.5,
											}}
										>
											{m.text}
										</div>
									</div>
								))}
								{chatLoading && (
									<div
										style={{
											display: 'flex',
											alignItems: 'center',
											gap: '0.4rem',
											color: 'var(--text-secondary)',
											fontSize: '0.8rem',
										}}
									>
										<Loader2
											size={13}
											style={{
												animation:
													'spin 1s linear infinite',
											}}
										/>{' '}
										Thinking…
									</div>
								)}
								<div ref={chatEndRef} />
							</div>
							<div
								style={{
									borderTop:
										'1px solid var(--outline-variant)',
									padding: '0.7rem 1.2rem',
									display: 'flex',
									gap: '0.5rem',
									flexShrink: 0,
								}}
							>
								<input
									value={chatInput}
									onChange={(e) =>
										setChatInput(e.target.value)
									}
									onKeyDown={(e) =>
										e.key === 'Enter' &&
										!e.shiftKey &&
										sendChat()
									}
									placeholder="Ask about this scenario…"
									style={{
										flex: 1,
										padding: '0.5rem 0.8rem',
										background:
											'var(--surface-container-high)',
										border: '1px solid var(--outline-variant)',
										borderRadius: '8px',
										fontSize: '0.85rem',
										color: 'var(--text-primary)',
										outline: 'none',
									}}
								/>
								<button
									onClick={sendChat}
									disabled={chatLoading || !chatInput.trim()}
									style={{
										padding: '0.5rem 0.8rem',
										background: 'var(--accent-color)',
										color: '#fff',
										border: 'none',
										borderRadius: '8px',
										cursor: chatLoading
											? 'not-allowed'
											: 'pointer',
										display: 'flex',
										alignItems: 'center',
									}}
								>
									<Send size={15} />
								</button>
							</div>
						</>
					)}
				</div>

				<style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
			</div>

			{showResimulateModal && (
				<ResimulateScenarioModal
					worldId={worldId}
					scenario={scenario}
					onClose={() => setShowResimulateModal(false)}
					onSuccess={handleResimulateSuccess}
				/>
			)}
		</>
	);
}
