import React, { useState, useEffect, useRef } from 'react';
import api from '../api';
import {
	Sparkles,
	RefreshCw,
	ChevronDown,
	ChevronUp,
	AlertTriangle,
	Users,
	MessageSquare,
	TrendingUp,
	CheckCircle,
	Loader,
} from 'lucide-react';

// ── Shared style tokens ────────────────────────────────────────────────────────
const CARD_STYLE = {
	background: 'var(--surface-container-low)',
	border: '1px solid var(--outline-variant)',
	borderRadius: '12px',
	overflow: 'hidden',
};

const LABEL_STYLE = {
	fontSize: '0.7rem',
	fontWeight: 700,
	textTransform: 'uppercase',
	letterSpacing: '0.08em',
	color: 'var(--text-secondary)',
	marginBottom: '0.4rem',
};

// ── Score bar ──────────────────────────────────────────────────────────────────
function ScoreBar({ score }) {
	const agreePct = Math.round((score?.agree ?? 0) * 100);
	const disagreePct = Math.round((score?.disagree ?? 0) * 100);
	const otherPct = Math.round((score?.other ?? 0) * 100);

	const segments = [
		{ label: `Agree ${agreePct}%`, pct: agreePct, color: '#10b981' },
		{
			label: `Disagree ${disagreePct}%`,
			pct: disagreePct,
			color: '#ef4444',
		},
		{ label: `Other ${otherPct}%`, pct: otherPct, color: '#f59e0b' },
	];

	return (
		<div>
			<div
				style={{
					display: 'flex',
					height: '10px',
					borderRadius: '6px',
					overflow: 'hidden',
					gap: '2px',
					marginBottom: '0.5rem',
				}}
			>
				{segments.map(
					(s) =>
						s.pct > 0 && (
							<div
								key={s.label}
								style={{
									width: `${s.pct}%`,
									background: s.color,
									transition: 'width 0.5s ease',
								}}
							/>
						),
				)}
			</div>
			<div
				style={{
					display: 'flex',
					gap: '1.2rem',
					flexWrap: 'wrap',
				}}
			>
				{segments.map((s) => (
					<div
						key={s.label}
						style={{
							display: 'flex',
							alignItems: 'center',
							gap: '0.4rem',
							fontSize: '0.8rem',
							color: 'var(--text-secondary)',
						}}
					>
						<div
							style={{
								width: '10px',
								height: '10px',
								borderRadius: '2px',
								background: s.color,
								flexShrink: 0,
							}}
						/>
						{s.label}
					</div>
				))}
			</div>
		</div>
	);
}

// ── Influence bar ─────────────────────────────────────────────────────────────
function InfluenceBar({ value }) {
	const pct = Math.round((value ?? 0) * 100);
	return (
		<div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
			<div
				style={{
					flex: 1,
					height: '5px',
					background: 'var(--outline-variant)',
					borderRadius: '3px',
					overflow: 'hidden',
				}}
			>
				<div
					style={{
						width: `${pct}%`,
						height: '100%',
						background: 'var(--accent-color)',
						borderRadius: '3px',
						transition: 'width 0.4s ease',
					}}
				/>
			</div>
			<span
				style={{
					fontSize: '0.72rem',
					fontWeight: 700,
					color: 'var(--accent-color)',
					minWidth: '32px',
				}}
			>
				{pct}%
			</span>
		</div>
	);
}

// ── Round pill ─────────────────────────────────────────────────────────────────
function RoundPill({ round, active, onClick }) {
	return (
		<button
			onClick={onClick}
			style={{
				padding: '0.2rem 0.6rem',
				borderRadius: '20px',
				border: `1.5px solid ${active ? 'var(--accent-color)' : 'var(--outline-variant)'}`,
				background: active ? 'var(--accent-color)' : 'transparent',
				color: active ? '#fff' : 'var(--text-secondary)',
				fontSize: '0.7rem',
				fontWeight: 600,
				cursor: 'pointer',
				transition: 'all 0.15s ease',
			}}
		>
			{round === 0 ? 'Initial' : `Round ${round}`}
		</button>
	);
}

// ── Agent position row ─────────────────────────────────────────────────────────
function AgentPositionRow({ agent }) {
	const [expanded, setExpanded] = useState(false);
	const [activeRound, setActiveRound] = useState(
		agent.position_history.length - 1,
	);

	const currentHistory = agent.position_history[activeRound];

	return (
		<div
			style={{
				background: 'var(--surface-container)',
				border: '1px solid var(--outline-variant)',
				borderRadius: '10px',
				overflow: 'hidden',
			}}
		>
			{/* Header */}
			<div
				onClick={() => setExpanded((e) => !e)}
				style={{
					display: 'flex',
					alignItems: 'center',
					gap: '0.75rem',
					padding: '0.75rem 1rem',
					cursor: 'pointer',
				}}
			>
				<div
					style={{
						width: '32px',
						height: '32px',
						borderRadius: '50%',
						background: 'var(--accent-color)',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						color: '#fff',
						fontSize: '0.75rem',
						fontWeight: 700,
						flexShrink: 0,
					}}
				>
					{(agent.agent_name || '?')[0].toUpperCase()}
				</div>

				<div style={{ flex: 1, minWidth: 0 }}>
					<p
						style={{
							margin: 0,
							fontWeight: 600,
							fontSize: '0.88rem',
						}}
					>
						{agent.agent_name}
					</p>
					<div style={{ marginTop: '0.25rem' }}>
						<InfluenceBar value={agent.influence_score} />
					</div>
				</div>

				<div style={{ color: 'var(--text-secondary)', flexShrink: 0 }}>
					{expanded ? (
						<ChevronUp size={15} />
					) : (
						<ChevronDown size={15} />
					)}
				</div>
			</div>

			{/* Expanded detail */}
			{expanded && (
				<div
					style={{
						padding: '0 1rem 1rem 1rem',
						borderTop: '1px solid var(--outline-variant)',
						paddingTop: '0.75rem',
					}}
				>
					{/* Round selector */}
					{agent.position_history.length > 1 && (
						<div
							style={{
								display: 'flex',
								gap: '0.4rem',
								flexWrap: 'wrap',
								marginBottom: '0.75rem',
							}}
						>
							{agent.position_history.map((ph, idx) => (
								<RoundPill
									key={idx}
									round={ph.round}
									active={activeRound === idx}
									onClick={() => setActiveRound(idx)}
								/>
							))}
						</div>
					)}

					{/* Position */}
					{currentHistory && (
						<>
							<p style={{ ...LABEL_STYLE }}>Position</p>
							<p
								style={{
									fontSize: '0.87rem',
									lineHeight: 1.55,
									margin: '0 0 0.75rem 0',
								}}
							>
								{currentHistory.position}
							</p>

							{currentHistory.reasoning && (
								<>
									<p style={{ ...LABEL_STYLE }}>Reasoning</p>
									<p
										style={{
											fontSize: '0.84rem',
											lineHeight: 1.5,
											color: 'var(--text-secondary)',
											margin: 0,
										}}
									>
										{currentHistory.reasoning}
									</p>
								</>
							)}
						</>
					)}
				</div>
			)}
		</div>
	);
}

// ── Answer group card ──────────────────────────────────────────────────────────
function AnswerGroupCard({ group, agents, index }) {
	const [expanded, setExpanded] = useState(false);

	const groupAgents = agents.filter((a) =>
		group.agent_ids.includes(a.agent_id),
	);
	const pct = Math.round((group.percentage ?? 0) * 100);

	const groupColors = [
		{ border: '#10b981', bg: 'rgba(16,185,129,0.08)', badge: '#10b981' },
		{ border: '#3b82f6', bg: 'rgba(59,130,246,0.08)', badge: '#3b82f6' },
		{ border: '#f59e0b', bg: 'rgba(245,158,11,0.08)', badge: '#f59e0b' },
		{ border: '#8b5cf6', bg: 'rgba(139,92,246,0.08)', badge: '#8b5cf6' },
	];
	const color = groupColors[index % groupColors.length];

	return (
		<div
			style={{
				border: `1.5px solid ${color.border}`,
				borderRadius: '12px',
				overflow: 'hidden',
				background: color.bg,
			}}
		>
			{/* Header */}
			<div
				onClick={() => setExpanded((e) => !e)}
				style={{
					padding: '0.9rem 1.1rem',
					cursor: 'pointer',
					display: 'flex',
					alignItems: 'flex-start',
					gap: '0.75rem',
				}}
			>
				<div
					style={{
						background: color.badge,
						color: '#fff',
						borderRadius: '20px',
						padding: '0.15rem 0.6rem',
						fontSize: '0.7rem',
						fontWeight: 700,
						flexShrink: 0,
						marginTop: '2px',
					}}
				>
					{pct}%
				</div>

				<div style={{ flex: 1, minWidth: 0 }}>
					<p
						style={{
							margin: '0 0 0.25rem 0',
							fontWeight: 700,
							fontSize: '0.92rem',
						}}
					>
						{group.label}
					</p>
					<p
						style={{
							margin: 0,
							fontSize: '0.82rem',
							color: 'var(--text-secondary)',
							lineHeight: 1.45,
						}}
					>
						{group.summary}
					</p>
				</div>

				<div
					style={{
						display: 'flex',
						alignItems: 'center',
						gap: '0.4rem',
						flexShrink: 0,
					}}
				>
					<span
						style={{
							fontSize: '0.78rem',
							color: 'var(--text-secondary)',
						}}
					>
						{group.agent_count}{' '}
						{group.agent_count === 1 ? 'agent' : 'agents'}
					</span>
					{expanded ? (
						<ChevronUp size={15} />
					) : (
						<ChevronDown size={15} />
					)}
				</div>
			</div>

			{/* Agent list */}
			{expanded && groupAgents.length > 0 && (
				<div
					style={{
						padding: '0 1rem 1rem 1rem',
						borderTop: `1px solid ${color.border}`,
						paddingTop: '0.75rem',
						display: 'flex',
						flexDirection: 'column',
						gap: '0.6rem',
					}}
				>
					<p style={{ ...LABEL_STYLE, marginBottom: '0.6rem' }}>
						Agents in this group
					</p>
					{groupAgents.map((agent) => (
						<AgentPositionRow
							key={agent.agent_id}
							agent={agent}
						/>
					))}
				</div>
			)}
		</div>
	);
}

// ── Insight card ───────────────────────────────────────────────────────────────
function InsightCard({ insight, index }) {
	const [open, setOpen] = useState(false);
	return (
		<div style={CARD_STYLE}>
			<div
				onClick={() => setOpen((o) => !o)}
				style={{
					padding: '0.9rem 1.1rem',
					cursor: 'pointer',
					display: 'flex',
					alignItems: 'flex-start',
					gap: '0.75rem',
				}}
			>
				<span
					style={{
						fontWeight: 700,
						fontSize: '0.68rem',
						color: 'var(--accent-color)',
						opacity: 0.75,
						minWidth: '22px',
						paddingTop: '2px',
					}}
				>
					#{index + 1}
				</span>
				<p
					style={{
						flex: 1,
						margin: 0,
						fontWeight: 600,
						fontSize: '0.9rem',
						lineHeight: 1.45,
					}}
				>
					{insight.text}
				</p>
				<div
					style={{
						color: 'var(--text-secondary)',
						flexShrink: 0,
						paddingTop: '2px',
					}}
				>
					{open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
				</div>
			</div>
			{open && (
				<div
					style={{
						padding: '0 1.1rem 1rem 1.1rem',
						borderTop: '1px solid var(--outline-variant)',
						paddingTop: '0.75rem',
					}}
				>
					<p style={LABEL_STYLE}>Synthesized Answer</p>
					<p
						style={{
							fontSize: '0.87rem',
							lineHeight: 1.55,
							margin: 0,
						}}
					>
						{insight.answer_text}
					</p>
				</div>
			)}
		</div>
	);
}

// ── Stat chip ─────────────────────────────────────────────────────────────────
function StatChip({ icon: Icon, label, value }) {
	return (
		<div
			style={{
				background: 'var(--surface-container)',
				border: '1px solid var(--outline-variant)',
				borderRadius: '10px',
				padding: '0.65rem 1rem',
				display: 'flex',
				alignItems: 'center',
				gap: '0.5rem',
			}}
		>
			<Icon
				size={14}
				style={{ color: 'var(--accent-color)' }}
			/>
			<span
				style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}
			>
				{label}
			</span>
			<span style={{ fontWeight: 700, fontSize: '0.88rem' }}>
				{value}
			</span>
		</div>
	);
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function InsightsDashboard({ sessionId, isScenario }) {
	const basePath = isScenario
		? `/insights/scenario/${sessionId}`
		: `/insights/${sessionId}`;

	// ui states: 'form' | 'loading' | 'results' | 'error'
	const [uiState, setUiState] = useState('form');
	const [query, setQuery] = useState('');
	const [debateRounds, setDebateRounds] = useState(3);
	const [loadingStage, setLoadingStage] = useState('Starting...');
	const [results, setResults] = useState(null);
	const [errorMsg, setErrorMsg] = useState(null);
	const pollingRef = useRef(null);

	// Check for existing results on mount or when sessionId changes
	useEffect(() => {
		let cancelled = false;
		async function checkInitial() {
			try {
				const { data } = await api.get(`${basePath}/status`);
				if (cancelled) return;
				if (data.status === 'complete') {
					const res = await api.get(basePath);
					if (!cancelled) {
						setResults(res.data);
						setQuery(res.data.query || '');
						setDebateRounds(res.data.debate_rounds || 3);
						setUiState('results');
					}
				} else if (data.status === 'running') {
					setLoadingStage(data.stage || 'Processing...');
					setUiState('loading');
					startPolling();
				} else if (data.status === 'error') {
					setErrorMsg(data.error || 'An error occurred.');
					setUiState('error');
				}
				// 'pending' → stay on form
			} catch {
				// no results yet — show form
			}
		}
		checkInitial();
		return () => {
			cancelled = true;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [sessionId]);

	function startPolling() {
		if (pollingRef.current) return;
		let elapsed = 0;
		pollingRef.current = setInterval(async () => {
			elapsed += 2500;
			if (elapsed > 300_000) {
				stopPolling();
				setErrorMsg(
					'Timed out waiting for insights. Please try again.',
				);
				setUiState('error');
				return;
			}
			try {
				const { data } = await api.get(`${basePath}/status`);
				if (data.status === 'complete') {
					stopPolling();
					const res = await api.get(basePath);
					setResults(res.data);
					setUiState('results');
				} else if (data.status === 'error') {
					stopPolling();
					setErrorMsg(data.error || 'An error occurred.');
					setUiState('error');
				} else if (data.stage) {
					setLoadingStage(data.stage);
				}
			} catch {
				// transient — keep polling
			}
		}, 2500);
	}

	function stopPolling() {
		if (pollingRef.current) {
			clearInterval(pollingRef.current);
			pollingRef.current = null;
		}
	}

	// Clean up on unmount
	useEffect(() => () => stopPolling(), []);

	async function handleSubmit(e) {
		e.preventDefault();
		const trimmed = query.trim();
		if (!trimmed) return;

		setUiState('loading');
		setLoadingStage('Submitting...');
		setErrorMsg(null);

		try {
			await api.post(`${basePath}/generate`, {
				query: trimmed,
				debate_rounds: debateRounds,
			});
			startPolling();
		} catch (err) {
			const detail =
				err?.response?.data?.detail ||
				'Failed to start insights generation.';
			setErrorMsg(detail);
			setUiState('error');
		}
	}

	// ── Form ────────────────────────────────────────────────────────────────
	if (uiState === 'form' || uiState === 'error') {
		return (
			<div
				style={{
					display: 'flex',
					flexDirection: 'column',
					gap: '1.2rem',
					padding: '0.25rem 0',
				}}
			>
				{/* Header */}
				<div
					style={{
						display: 'flex',
						alignItems: 'center',
						gap: '0.6rem',
					}}
				>
					<Sparkles
						size={18}
						style={{ color: 'var(--accent-color)' }}
					/>
					<h2
						style={{
							margin: 0,
							fontSize: '1.05rem',
							fontWeight: 700,
						}}
					>
						Insights
					</h2>
				</div>

				{uiState === 'error' && (
					<div
						style={{
							display: 'flex',
							alignItems: 'flex-start',
							gap: '0.6rem',
							background: 'rgba(239,68,68,0.08)',
							border: '1px solid rgba(239,68,68,0.3)',
							borderRadius: '10px',
							padding: '0.75rem 1rem',
						}}
					>
						<AlertTriangle
							size={15}
							style={{
								color: '#ef4444',
								flexShrink: 0,
								marginTop: '1px',
							}}
						/>
						<p
							style={{
								margin: 0,
								fontSize: '0.85rem',
								color: '#ef4444',
							}}
						>
							{errorMsg}
						</p>
					</div>
				)}

				<form
					onSubmit={handleSubmit}
					style={{
						display: 'flex',
						flexDirection: 'column',
						gap: '1rem',
					}}
				>
					{/* Query input */}
					<div>
						<label
							style={{
								...LABEL_STYLE,
								display: 'block',
								marginBottom: '0.5rem',
							}}
						>
							Your Question or Query
						</label>
						<textarea
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							placeholder="e.g. Did the agents reach a consensus on climate change? What were the dominant narratives?"
							rows={4}
							style={{
								width: '100%',
								boxSizing: 'border-box',
								background: 'var(--surface-container)',
								border: '1px solid var(--outline-variant)',
								borderRadius: '10px',
								padding: '0.75rem 1rem',
								fontSize: '0.9rem',
								lineHeight: 1.5,
								resize: 'vertical',
								color: 'inherit',
								fontFamily: 'inherit',
								outline: 'none',
							}}
							onFocus={(e) =>
								(e.target.style.borderColor =
									'var(--accent-color)')
							}
							onBlur={(e) =>
								(e.target.style.borderColor =
									'var(--outline-variant)')
							}
						/>
					</div>

					{/* Debate rounds */}
					<div>
						<label
							style={{
								...LABEL_STYLE,
								display: 'flex',
								justifyContent: 'space-between',
								alignItems: 'center',
								marginBottom: '0.5rem',
							}}
						>
							<span>Debate Rounds</span>
							<span
								style={{
									background: 'var(--accent-color)',
									color: '#fff',
									borderRadius: '20px',
									padding: '0.1rem 0.55rem',
									fontSize: '0.7rem',
									fontWeight: 700,
								}}
							>
								{debateRounds}
							</span>
						</label>
						<input
							type="range"
							min={1}
							max={10}
							value={debateRounds}
							onChange={(e) =>
								setDebateRounds(Number(e.target.value))
							}
							style={{
								width: '100%',
								accentColor: 'var(--accent-color)',
							}}
						/>
						<div
							style={{
								display: 'flex',
								justifyContent: 'space-between',
								fontSize: '0.7rem',
								color: 'var(--text-secondary)',
								marginTop: '0.2rem',
							}}
						>
							<span>1 — Quick</span>
							<span>10 — Thorough</span>
						</div>
					</div>

					<button
						type="submit"
						disabled={!query.trim()}
						style={{
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							gap: '0.5rem',
							background: query.trim()
								? 'var(--accent-color)'
								: 'var(--outline-variant)',
							color: query.trim()
								? '#fff'
								: 'var(--text-secondary)',
							border: 'none',
							borderRadius: '10px',
							padding: '0.75rem 1.5rem',
							fontSize: '0.9rem',
							fontWeight: 700,
							cursor: query.trim() ? 'pointer' : 'not-allowed',
							transition: 'background 0.15s ease',
						}}
					>
						<Sparkles size={15} />
						Run Insights
					</button>
				</form>
			</div>
		);
	}

	// ── Loading ─────────────────────────────────────────────────────────────
	if (uiState === 'loading') {
		return (
			<div
				style={{
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
					justifyContent: 'center',
					gap: '1.2rem',
					padding: '3rem 1rem',
					textAlign: 'center',
				}}
			>
				<Loader
					size={32}
					style={{
						color: 'var(--accent-color)',
						animation: 'spin 1s linear infinite',
					}}
				/>
				<div>
					<p
						style={{
							margin: '0 0 0.3rem 0',
							fontWeight: 700,
							fontSize: '1rem',
						}}
					>
						Generating Insights
					</p>
					<p
						style={{
							margin: 0,
							fontSize: '0.85rem',
							color: 'var(--text-secondary)',
						}}
					>
						{loadingStage}
					</p>
				</div>
				<style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
			</div>
		);
	}

	// ── Results ─────────────────────────────────────────────────────────────
	if (uiState === 'results' && results) {
		const {
			insights,
			overall_verdict,
			score,
			answer_groups,
			agents,
			aggregate,
		} = results;

		return (
			<div
				style={{
					display: 'flex',
					flexDirection: 'column',
					gap: '1.4rem',
					padding: '0.25rem 0',
				}}
			>
				{/* Header */}
				<div
					style={{
						display: 'flex',
						alignItems: 'flex-start',
						justifyContent: 'space-between',
						gap: '0.75rem',
					}}
				>
					<div
						style={{
							display: 'flex',
							alignItems: 'center',
							gap: '0.6rem',
						}}
					>
						<Sparkles
							size={18}
							style={{ color: 'var(--accent-color)' }}
						/>
						<h2
							style={{
								margin: 0,
								fontSize: '1.05rem',
								fontWeight: 700,
							}}
						>
							Insights
						</h2>
					</div>
					<button
						onClick={() => {
							setResults(null);
							setUiState('form');
						}}
						style={{
							display: 'flex',
							alignItems: 'center',
							gap: '0.4rem',
							background: 'transparent',
							border: '1px solid var(--outline-variant)',
							borderRadius: '8px',
							padding: '0.35rem 0.75rem',
							cursor: 'pointer',
							fontSize: '0.78rem',
							color: 'var(--text-secondary)',
						}}
					>
						<RefreshCw size={12} />
						Re-run
					</button>
				</div>

				{/* Query banner */}
				<div
					style={{
						borderLeft: '3px solid var(--accent-color)',
						paddingLeft: '0.85rem',
						fontSize: '0.9rem',
						fontStyle: 'italic',
						color: 'var(--text-secondary)',
						lineHeight: 1.5,
					}}
				>
					{results.query}
				</div>

				{/* Stats row */}
				{aggregate && (
					<div
						style={{
							display: 'flex',
							flexWrap: 'wrap',
							gap: '0.5rem',
						}}
					>
						<StatChip
							icon={Users}
							label="Agents"
							value={aggregate.total_agents}
						/>
						<StatChip
							icon={MessageSquare}
							label="Posts"
							value={aggregate.total_posts}
						/>
						<StatChip
							icon={TrendingUp}
							label="Actions"
							value={aggregate.total_actions}
						/>
						<StatChip
							icon={RefreshCw}
							label="Debate Rounds"
							value={results.debate_rounds}
						/>
					</div>
				)}

				{/* Insights */}
				{insights && insights.length > 0 && (
					<section>
						<p
							style={{
								...LABEL_STYLE,
								display: 'flex',
								alignItems: 'center',
								gap: '0.4rem',
								marginBottom: '0.6rem',
							}}
						>
							<CheckCircle size={12} />
							Insight Observations
						</p>
						<div
							style={{
								display: 'flex',
								flexDirection: 'column',
								gap: '0.5rem',
							}}
						>
							{insights.map((ins, i) => (
								<InsightCard
									key={ins.id}
									insight={ins}
									index={i}
								/>
							))}
						</div>
					</section>
				)}

				{/* Verdict + Score */}
				{overall_verdict && (
					<section style={CARD_STYLE}>
						<div style={{ padding: '1rem 1.2rem' }}>
							<p
								style={{
									...LABEL_STYLE,
									display: 'flex',
									alignItems: 'center',
									gap: '0.4rem',
								}}
							>
								<Sparkles size={12} />
								Overall Verdict
							</p>
							<p
								style={{
									margin: '0 0 1rem 0',
									fontSize: '0.9rem',
									lineHeight: 1.6,
								}}
							>
								{overall_verdict}
							</p>
							{score && (
								<>
									<p
										style={{
											...LABEL_STYLE,
											marginBottom: '0.5rem',
										}}
									>
										Agent Agreement
									</p>
									<ScoreBar score={score} />
								</>
							)}
						</div>
					</section>
				)}

				{/* Answer groups */}
				{answer_groups && answer_groups.length > 0 && (
					<section>
						<p
							style={{
								...LABEL_STYLE,
								display: 'flex',
								alignItems: 'center',
								gap: '0.4rem',
								marginBottom: '0.6rem',
							}}
						>
							<Users size={12} />
							Agent Answer Groups
						</p>
						<p
							style={{
								fontSize: '0.8rem',
								color: 'var(--text-secondary)',
								margin: '0 0 0.75rem 0',
							}}
						>
							Click a group to see which agents held that position
							and why.
						</p>
						<div
							style={{
								display: 'flex',
								flexDirection: 'column',
								gap: '0.65rem',
							}}
						>
							{answer_groups.map((grp, i) => (
								<AnswerGroupCard
									key={grp.group_id}
									group={grp}
									agents={agents || []}
									index={i}
								/>
							))}
						</div>
					</section>
				)}
			</div>
		);
	}

	return null;
}
