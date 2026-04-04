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
	Download,
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

// ── Insight list card (for the list view) ─────────────────────────────────────
const STATUS_CONFIG = {
	complete: {
		label: 'Complete',
		color: '#10b981',
		bg: 'rgba(16,185,129,0.1)',
	},
	running: { label: 'Running', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
	pending: {
		label: 'Pending',
		color: '#94a3b8',
		bg: 'rgba(148,163,184,0.1)',
	},
	error: { label: 'Error', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
};

function InsightListCard({ record, onClick }) {
	const cfg = STATUS_CONFIG[record.status] || STATUS_CONFIG.pending;
	const date = record.created_at
		? new Date(record.created_at).toLocaleString(undefined, {
				dateStyle: 'medium',
				timeStyle: 'short',
			})
		: '';
	const preview =
		record.query.length > 120
			? record.query.slice(0, 117) + '…'
			: record.query;

	return (
		<div
			onClick={onClick}
			style={{
				...CARD_STYLE,
				cursor: 'pointer',
				padding: '0.9rem 1.1rem',
				display: 'flex',
				alignItems: 'flex-start',
				gap: '0.85rem',
				transition: 'border-color 0.15s ease',
			}}
			onMouseEnter={(e) =>
				(e.currentTarget.style.borderColor = 'var(--accent-color)')
			}
			onMouseLeave={(e) =>
				(e.currentTarget.style.borderColor = 'var(--outline-variant)')
			}
		>
			<Sparkles
				size={16}
				style={{
					color: 'var(--accent-color)',
					flexShrink: 0,
					marginTop: '2px',
				}}
			/>
			<div style={{ flex: 1, minWidth: 0 }}>
				<p
					style={{
						margin: '0 0 0.35rem 0',
						fontSize: '0.88rem',
						fontWeight: 600,
						lineHeight: 1.4,
					}}
				>
					{preview}
				</p>
				<div
					style={{
						display: 'flex',
						alignItems: 'center',
						gap: '0.75rem',
						flexWrap: 'wrap',
					}}
				>
					<span
						style={{
							fontSize: '0.68rem',
							fontWeight: 700,
							textTransform: 'uppercase',
							letterSpacing: '0.06em',
							padding: '0.15rem 0.5rem',
							borderRadius: '20px',
							color: cfg.color,
							background: cfg.bg,
						}}
					>
						{cfg.label}
					</span>
					<span
						style={{
							fontSize: '0.75rem',
							color: 'var(--text-secondary)',
						}}
					>
						{record.debate_rounds} debate{' '}
						{record.debate_rounds === 1 ? 'round' : 'rounds'}
					</span>
					{date && (
						<span
							style={{
								fontSize: '0.75rem',
								color: 'var(--text-secondary)',
							}}
						>
							{date}
						</span>
					)}
				</div>
			</div>
			<ChevronDown
				size={14}
				style={{
					color: 'var(--text-secondary)',
					flexShrink: 0,
					transform: 'rotate(-90deg)',
					marginTop: '2px',
				}}
			/>
		</div>
	);
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function InsightsDashboard({ sessionId, isScenario }) {
	const basePath = isScenario
		? `/insights/scenario/${sessionId}`
		: `/insights/${sessionId}`;

	// view: 'list' | 'form' | 'loading' | 'detail'
	const [view, setView] = useState('list');
	const [insightsList, setInsightsList] = useState([]);
	const [listLoading, setListLoading] = useState(true);
	const [query, setQuery] = useState('');
	const [debateRounds, setDebateRounds] = useState(3);
	const [loadingStage, setLoadingStage] = useState('Starting...');
	const [activeInsightId, setActiveInsightId] = useState(null);
	const [results, setResults] = useState(null);
	const [errorMsg, setErrorMsg] = useState(null);
	const [pdfLoading, setPdfLoading] = useState(false);
	const pollingRef = useRef(null);
	const detailRef = useRef(null);

	function buildPdfHtml(r) {
		const esc = (s) =>
			String(s ?? '')
				.replace(/&/g, '&amp;')
				.replace(/</g, '&lt;')
				.replace(/>/g, '&gt;');

		const {
			query,
			insights = [],
			overall_verdict,
			score,
			answer_groups = [],
			agents = [],
			aggregate,
			debate_rounds,
		} = r;

		const generatedAt = new Date().toLocaleString(undefined, {
			dateStyle: 'long',
			timeStyle: 'short',
		});

		const agreePct = Math.round((score?.agree ?? 0) * 100);
		const disagreePct = Math.round((score?.disagree ?? 0) * 100);
		const otherPct = Math.round((score?.other ?? 0) * 100);

		const scoreBar = score
			? `<div style="margin:8px 0 12px">
				<div style="height:10px;border-radius:6px;overflow:hidden;background:#e8e8e8;display:flex;gap:2px;margin-bottom:8px">
					${agreePct > 0 ? `<div style="width:${agreePct}%;background:#10b981;height:100%"></div>` : ''}
					${disagreePct > 0 ? `<div style="width:${disagreePct}%;background:#ef4444;height:100%"></div>` : ''}
					${otherPct > 0 ? `<div style="width:${otherPct}%;background:#f59e0b;height:100%"></div>` : ''}
				</div>
				<div style="font-size:12px;color:#555">
					<span style="margin-right:16px">&#9632; Agree ${agreePct}%</span>
					<span style="margin-right:16px">&#9632; Disagree ${disagreePct}%</span>
					<span>&#9632; Other ${otherPct}%</span>
				</div>
			</div>`
			: '';

		const observationsHtml = insights.length
			? insights
					.map(
						(ins, i) => `
			<div style="margin-bottom:20px;padding-bottom:20px;border-bottom:1px solid #e8e8e8">
				<p style="margin:0 0 8px 0;font-size:14px;font-weight:700;color:#1a1a2e;line-height:1.4">
					<span style="color:#4f46e5;margin-right:6px">#${i + 1}</span>${esc(ins.text)}
				</p>
				${
					ins.answer_text
						? `<p style="margin:6px 0 3px;font-size:11px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:0.07em">Synthesized Answer</p>
				<p style="margin:0;font-size:13px;line-height:1.65;color:#333">${esc(ins.answer_text)}</p>`
						: ''
				}
			</div>`,
					)
					.join('')
			: '<p style="color:#888;font-size:13px">No observations recorded.</p>';

		const groupColors = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6'];

		const groupsHtml = answer_groups.length
			? answer_groups
					.map((grp, i) => {
						const pct = Math.round((grp.percentage ?? 0) * 100);
						const color = groupColors[i % groupColors.length];
						return `
				<div style="margin-bottom:14px;padding:14px 16px;border-left:4px solid ${color};background:#f9f9f9">
					<div style="margin-bottom:6px">
						<span style="background:${color};color:#fff;border-radius:20px;padding:2px 10px;font-size:11px;font-weight:700;margin-right:8px">${pct}%</span>
						<span style="font-size:14px;font-weight:700;color:#1a1a2e">${esc(grp.label)}</span>
					</div>
					${grp.summary ? `<p style="margin:6px 0 4px;font-size:12px;color:#555;line-height:1.55">${esc(grp.summary)}</p>` : ''}
					<p style="margin:6px 0 0;font-size:11px;color:#999">${grp.agent_count} ${grp.agent_count === 1 ? 'agent' : 'agents'}</p>
				</div>`;
					})
					.join('')
			: '<p style="color:#888;font-size:13px">No groups available.</p>';

		const agentsHtml = agents.length
			? agents
					.map((agent) => {
						const influencePct = Math.round(
							(agent.influence_score ?? 0) * 100,
						);
						const allRounds = (agent.position_history || [])
							.map(
								(ph) => `
						<div style="margin-bottom:12px;padding-left:12px;border-left:2px solid #e0e0e0">
							<p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#4f46e5;text-transform:uppercase;letter-spacing:0.05em">
								${ph.round === 0 ? 'Initial Position' : `Round ${ph.round}`}
							</p>
							${ph.position ? `<p style="margin:0 0 4px;font-size:13px;line-height:1.55;color:#222">${esc(ph.position)}</p>` : ''}
							${ph.reasoning ? `<p style="margin:0;font-size:12px;line-height:1.5;color:#666;font-style:italic">${esc(ph.reasoning)}</p>` : ''}
						</div>`,
							)
							.join('');
						return `
					<div style="margin-bottom:22px;padding:16px;border:1px solid #e0e0e0;background:#fff">
						<div style="margin-bottom:12px">
							<p style="margin:0 0 4px;font-size:14px;font-weight:700;color:#1a1a2e">${esc(agent.agent_name)}</p>
							<div style="display:flex;align-items:center;gap:8px">
								<div style="flex:1;height:5px;background:#e8e8e8;border-radius:3px;overflow:hidden">
									<div style="width:${influencePct}%;height:5px;background:#4f46e5"></div>
								</div>
								<span style="font-size:11px;font-weight:700;color:#4f46e5">${influencePct}% influence</span>
							</div>
						</div>
						${allRounds}
					</div>`;
					})
					.join('')
			: '<p style="color:#888;font-size:13px">No agent data available.</p>';

		const statsHtml = aggregate
			? `<div style="margin-bottom:28px;padding:14px 16px;background:#f5f5f5;border:1px solid #e0e0e0">
				<span style="font-size:12px;color:#555;margin-right:20px">Agents: <strong>${aggregate.total_agents}</strong></span>
				<span style="font-size:12px;color:#555;margin-right:20px">Posts: <strong>${aggregate.total_posts}</strong></span>
				<span style="font-size:12px;color:#555;margin-right:20px">Actions: <strong>${aggregate.total_actions}</strong></span>
				<span style="font-size:12px;color:#555">Debate Rounds: <strong>${debate_rounds}</strong></span>
			</div>`
			: '';

		return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Insights Report</title>
<style>
  @page { size: A4; margin: 20mm 22mm; }
  * { box-sizing: border-box; }
  body { font-family: Georgia, 'Times New Roman', serif; color: #1a1a2e; background: #fff; margin: 0; padding: 0; font-size: 13px; line-height: 1.6; }
  h1 { font-size: 22px; font-weight: 700; margin: 0 0 8px; line-height: 1.3; }
  h2 { font-size: 15px; font-weight: 700; margin: 0 0 14px; padding-bottom: 7px; border-bottom: 2px solid #4f46e5; color: #1a1a2e; }
  p { margin: 0; }
  .section { margin-bottom: 32px; }
  .subtitle { font-size: 12px; color: #777; margin-bottom: 14px; }
  .label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: #888; margin-bottom: 5px; }
  .obs-block { margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid #e8e8e8; }
  .obs-block:last-child { border-bottom: none; }
  .obs-num { color: #4f46e5; margin-right: 6px; }
  .obs-text { font-size: 14px; font-weight: 700; margin: 0 0 8px; line-height: 1.4; }
  .syn-answer { font-size: 13px; line-height: 1.65; color: #333; margin: 0; }
  .verdict-text { font-size: 13px; line-height: 1.75; color: #333; margin-bottom: 14px; }
  .score-bar-row { display: flex; gap: 20px; font-size: 12px; color: #555; margin-top: 8px; }
  .score-swatch { display: inline-block; width: 10px; height: 10px; border-radius: 2px; margin-right: 5px; vertical-align: middle; }
  .group-block { margin-bottom: 14px; padding: 13px 15px; border-left: 4px solid #4f46e5; background: #f9f9f9; }
  .group-pct { display: inline-block; color: #fff; border-radius: 20px; padding: 2px 10px; font-size: 11px; font-weight: 700; margin-right: 8px; vertical-align: middle; }
  .group-label { font-size: 14px; font-weight: 700; vertical-align: middle; }
  .group-summary { font-size: 12px; color: #555; margin-top: 6px; line-height: 1.5; }
  .group-count { font-size: 11px; color: #999; margin-top: 5px; }
  .agent-block { margin-bottom: 22px; padding: 15px; border: 1px solid #e0e0e0; page-break-inside: avoid; }
  .agent-name { font-size: 14px; font-weight: 700; margin: 0 0 6px; }
  .influence-track { height: 5px; background: #e8e8e8; border-radius: 3px; overflow: hidden; flex: 1; }
  .influence-fill { height: 5px; background: #4f46e5; }
  .influence-row { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
  .influence-label { font-size: 11px; font-weight: 700; color: #4f46e5; white-space: nowrap; }
  .round-block { margin-bottom: 12px; padding-left: 12px; border-left: 2px solid #e0e0e0; }
  .round-label { font-size: 11px; font-weight: 700; color: #4f46e5; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 4px; }
  .round-position { font-size: 13px; line-height: 1.55; color: #222; margin: 0 0 4px; }
  .round-reasoning { font-size: 12px; line-height: 1.5; color: #666; font-style: italic; margin: 0; }
  .stats-row { display: flex; gap: 0; margin-bottom: 28px; background: #f5f5f5; border: 1px solid #e0e0e0; padding: 12px 16px; }
  .stat-item { font-size: 12px; color: #555; margin-right: 24px; }
  .stat-item strong { color: #1a1a2e; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .agent-block { page-break-inside: avoid; }
    .section { page-break-inside: avoid; }
  }
</style>
</head>
<body>

<div class="section" style="border-bottom:3px solid #4f46e5;padding-bottom:18px;margin-bottom:28px">
  <p class="label" style="color:#4f46e5">Thallus &mdash; Insights Report</p>
  <h1>${esc(query)}</h1>
  <p style="font-size:11px;color:#999;margin-top:4px">Generated ${generatedAt}</p>
</div>

${statsHtml}

<div class="section">
  <h2>Observations</h2>
  ${observationsHtml}
</div>

${
	overall_verdict
		? `<div class="section">
  <h2>Overall Verdict</h2>
  <p class="verdict-text">${esc(overall_verdict)}</p>
  ${
		score
			? `<p class="label">Agent Agreement</p>
  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px"><tr>
    ${agreePct > 0 ? `<td style="width:${agreePct}%;background:#10b981;height:10px;border-radius:3px 0 0 3px"></td>` : ''}
    ${disagreePct > 0 ? `<td style="width:${disagreePct}%;background:#ef4444;height:10px"></td>` : ''}
    ${otherPct > 0 ? `<td style="width:${otherPct}%;background:#f59e0b;height:10px;border-radius:0 3px 3px 0"></td>` : ''}
  </tr></table>
  <div class="score-bar-row">
    <span><span class="score-swatch" style="background:#10b981"></span>Agree ${agreePct}%</span>
    <span><span class="score-swatch" style="background:#ef4444"></span>Disagree ${disagreePct}%</span>
    <span><span class="score-swatch" style="background:#f59e0b"></span>Other ${otherPct}%</span>
  </div>`
			: ''
  }
</div>`
		: ''
}

${
	answer_groups.length
		? `<div class="section">
  <h2>Agent Answer Groups</h2>
  <p class="subtitle">How agents clustered around different positions.</p>
  ${groupsHtml}
</div>`
		: ''
}

${
	agents.length
		? `<div class="section">
  <h2>Agent Debate Log</h2>
  <p class="subtitle">Position and reasoning for each agent across all debate rounds.</p>
  ${agentsHtml}
</div>`
		: ''
}

</body>
</html>`;
	}

	function downloadPdf() {
		if (!results) return;
		const win = window.open('', '_blank');
		if (!win) return;
		win.document.open();
		win.document.write(buildPdfHtml(results));
		win.document.close();
		win.addEventListener('load', () => {
			setTimeout(() => {
				win.focus();
				win.print();
			}, 250);
		});
	}

	// Fetch list of all insights
	async function fetchList() {
		setListLoading(true);
		try {
			const { data } = await api.get(`${basePath}/`);
			setInsightsList(data);
		} catch {
			setInsightsList([]);
		} finally {
			setListLoading(false);
		}
	}

	useEffect(() => {
		fetchList();
		return () => stopPolling();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [sessionId]);

	function stopPolling() {
		if (pollingRef.current) {
			clearInterval(pollingRef.current);
			pollingRef.current = null;
		}
	}

	function startPolling(insightId) {
		if (pollingRef.current) return;
		let elapsed = 0;
		pollingRef.current = setInterval(async () => {
			elapsed += 2500;
			if (elapsed > 300_000) {
				stopPolling();
				setErrorMsg(
					'Timed out waiting for insights. Please try again.',
				);
				setView('form');
				return;
			}
			try {
				const { data } = await api.get(
					`${basePath}/${insightId}/status`,
				);
				if (data.status === 'complete') {
					stopPolling();
					const res = await api.get(`${basePath}/${insightId}`);
					setResults(res.data);
					setView('detail');
					fetchList();
				} else if (data.status === 'error') {
					stopPolling();
					setErrorMsg(data.error || 'An error occurred.');
					setView('form');
					fetchList();
				} else if (data.stage) {
					setLoadingStage(data.stage);
				}
			} catch {
				// transient — keep polling
			}
		}, 2500);
	}

	async function openInsight(record) {
		if (record.status === 'complete') {
			try {
				const res = await api.get(`${basePath}/${record.insight_id}`);
				setResults(res.data);
				setActiveInsightId(record.insight_id);
				setView('detail');
			} catch {
				setErrorMsg('Failed to load insight.');
			}
		} else if (record.status === 'running' || record.status === 'pending') {
			setActiveInsightId(record.insight_id);
			setLoadingStage('Processing...');
			setView('loading');
			startPolling(record.insight_id);
		} else if (record.status === 'error') {
			setErrorMsg('This insight encountered an error during generation.');
			setActiveInsightId(record.insight_id);
			setView('form');
		}
	}

	async function handleSubmit(e) {
		e.preventDefault();
		const trimmed = query.trim();
		if (!trimmed) return;

		setView('loading');
		setLoadingStage('Submitting...');
		setErrorMsg(null);

		try {
			const { data } = await api.post(`${basePath}/generate`, {
				query: trimmed,
				debate_rounds: debateRounds,
			});
			const newInsightId = data.insight_id;
			setActiveInsightId(newInsightId);
			fetchList();
			startPolling(newInsightId);
		} catch (err) {
			const detail =
				err?.response?.data?.detail ||
				'Failed to start insights generation.';
			setErrorMsg(detail);
			setView('form');
		}
	}

	// ── List view ───────────────────────────────────────────────────────────
	if (view === 'list') {
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
						justifyContent: 'space-between',
						gap: '0.6rem',
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
							setErrorMsg(null);
							setQuery('');
							setDebateRounds(3);
							setView('form');
						}}
						style={{
							display: 'flex',
							alignItems: 'center',
							gap: '0.4rem',
							background: 'var(--accent-color)',
							color: '#fff',
							border: 'none',
							borderRadius: '8px',
							padding: '0.35rem 0.85rem',
							cursor: 'pointer',
							fontSize: '0.78rem',
							fontWeight: 700,
						}}
					>
						<Sparkles size={12} />
						New Insight
					</button>
				</div>

				{listLoading ? (
					<div
						style={{
							display: 'flex',
							alignItems: 'center',
							gap: '0.5rem',
							color: 'var(--text-secondary)',
							fontSize: '0.85rem',
						}}
					>
						<Loader
							size={14}
							style={{ animation: 'spin 1s linear infinite' }}
						/>
						Loading...
						<style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
					</div>
				) : insightsList.length === 0 ? (
					<div
						style={{
							background: 'var(--surface-container)',
							border: '1px dashed var(--outline-variant)',
							borderRadius: '12px',
							padding: '2.5rem 1.5rem',
							textAlign: 'center',
						}}
					>
						<Sparkles
							size={28}
							style={{
								color: 'var(--accent-color)',
								opacity: 0.5,
								marginBottom: '0.75rem',
							}}
						/>
						<p
							style={{
								margin: '0 0 0.4rem 0',
								fontWeight: 600,
								fontSize: '0.95rem',
							}}
						>
							No insights yet
						</p>
						<p
							style={{
								margin: 0,
								fontSize: '0.82rem',
								color: 'var(--text-secondary)',
							}}
						>
							Ask a question about your simulation to generate
							your first insight dashboard.
						</p>
					</div>
				) : (
					<div
						style={{
							display: 'flex',
							flexDirection: 'column',
							gap: '0.6rem',
						}}
					>
						{insightsList.map((record) => (
							<InsightListCard
								key={record.insight_id}
								record={record}
								onClick={() => openInsight(record)}
							/>
						))}
					</div>
				)}
			</div>
		);
	}

	// ── Form view ────────────────────────────────────────────────────────────
	if (view === 'form') {
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
						justifyContent: 'space-between',
						gap: '0.6rem',
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
							New Insight
						</h2>
					</div>
					<button
						onClick={() => {
							setErrorMsg(null);
							setView('list');
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
						← All Insights
					</button>
				</div>

				{errorMsg && (
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
	if (view === 'loading') {
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

	// ── Detail / Results ─────────────────────────────────────────────────────
	if (view === 'detail' && results) {
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
				ref={detailRef}
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
					<div
						style={{
							display: 'flex',
							alignItems: 'center',
							gap: '0.5rem',
						}}
					>
						<button
							onClick={downloadPdf}
							disabled={pdfLoading}
							style={{
								display: 'flex',
								alignItems: 'center',
								gap: '0.4rem',
								background: 'var(--accent-color)',
								color: '#fff',
								border: 'none',
								borderRadius: '8px',
								padding: '0.35rem 0.85rem',
								cursor: pdfLoading ? 'not-allowed' : 'pointer',
								fontSize: '0.78rem',
								fontWeight: 700,
								opacity: pdfLoading ? 0.7 : 1,
							}}
						>
							{pdfLoading ? (
								<Loader
									size={12}
									style={{
										animation: 'spin 1s linear infinite',
									}}
								/>
							) : (
								<Download size={12} />
							)}
							{pdfLoading ? 'Exporting…' : 'PDF'}
						</button>
						<button
							onClick={() => {
								setResults(null);
								setActiveInsightId(null);
								setView('list');
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
							← All Insights
						</button>
					</div>
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
