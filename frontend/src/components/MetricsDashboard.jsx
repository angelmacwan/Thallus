import React, { useState, useEffect } from 'react';
import api from '../api';
import {
	RefreshCw,
	BarChart2,
	CheckCircle,
	XCircle,
	HelpCircle,
	ChevronDown,
	ChevronUp,
	AlertTriangle,
	Target,
	Users,
	Activity,
} from 'lucide-react';

// ── Confidence bar ─────────────────────────────────────────────────────────────
function ConfidenceBar({ value }) {
	const pct = Math.round(value * 100);
	let color = '#10b981'; // green ≥ 70
	if (pct < 40)
		color = '#ef4444'; // red   < 40
	else if (pct < 70) color = '#f59e0b'; // amber 40-69

	return (
		<div
			style={{
				display: 'flex',
				alignItems: 'center',
				gap: '0.6rem',
				marginTop: '0.35rem',
			}}
		>
			<div
				style={{
					flex: 1,
					height: '6px',
					background: 'var(--outline-variant)',
					borderRadius: '3px',
					overflow: 'hidden',
				}}
			>
				<div
					style={{
						width: `${pct}%`,
						height: '100%',
						background: color,
						borderRadius: '3px',
						transition: 'width 0.4s ease',
					}}
				/>
			</div>
			<span
				style={{
					fontSize: '0.78rem',
					fontWeight: 700,
					color,
					minWidth: '36px',
				}}
			>
				{pct}%
			</span>
		</div>
	);
}

// ── Answer badge ───────────────────────────────────────────────────────────────
function AnswerBadge({ answer }) {
	const config = {
		YES: {
			icon: CheckCircle,
			color: '#10b981',
			bg: 'rgba(16,185,129,0.12)',
			label: 'YES',
		},
		NO: {
			icon: XCircle,
			color: '#ef4444',
			bg: 'rgba(239,68,68,0.12)',
			label: 'NO',
		},
		MAYBE: {
			icon: HelpCircle,
			color: '#f59e0b',
			bg: 'rgba(245,158,11,0.12)',
			label: 'MAYBE',
		},
	};
	const { icon: Icon, color, bg, label } = config[answer] ?? config.MAYBE;
	return (
		<span
			style={{
				display: 'inline-flex',
				alignItems: 'center',
				gap: '0.3rem',
				padding: '0.25rem 0.65rem',
				borderRadius: '20px',
				background: bg,
				color,
				fontWeight: 700,
				fontSize: '0.78rem',
				letterSpacing: '0.05em',
			}}
		>
			<Icon size={13} />
			{label}
		</span>
	);
}

// ── Single Q&A card ───────────────────────────────────────────────────────────
function QuestionCard({ qa, index }) {
	const [open, setOpen] = useState(false);

	return (
		<div
			style={{
				background: 'var(--surface-container-low)',
				borderRadius: '12px',
				overflow: 'hidden',
				border: '1px solid var(--outline-variant)',
			}}
		>
			{/* Header row */}
			<div
				onClick={() => setOpen((o) => !o)}
				style={{
					padding: '1rem 1.2rem',
					cursor: 'pointer',
					display: 'flex',
					alignItems: 'flex-start',
					gap: '0.9rem',
				}}
			>
				<span
					style={{
						fontWeight: 700,
						fontSize: '0.72rem',
						color: 'var(--accent-color)',
						opacity: 0.7,
						minWidth: '24px',
						paddingTop: '2px',
					}}
				>
					Q{index + 1}
				</span>

				<div style={{ flex: 1, minWidth: 0 }}>
					<p
						style={{
							margin: 0,
							fontWeight: 600,
							fontSize: '0.92rem',
							lineHeight: 1.4,
						}}
					>
						{qa.question}
					</p>
					<div
						style={{
							marginTop: '0.5rem',
							display: 'flex',
							alignItems: 'center',
							gap: '0.75rem',
							flexWrap: 'wrap',
						}}
					>
						<AnswerBadge answer={qa.answer} />
						<div style={{ flex: 1, minWidth: '120px' }}>
							<ConfidenceBar value={qa.confidence} />
						</div>
					</div>
				</div>

				<div
					style={{
						color: 'var(--text-secondary)',
						flexShrink: 0,
						paddingTop: '2px',
					}}
				>
					{open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
				</div>
			</div>

			{/* Expanded detail */}
			{open && (
				<div
					style={{
						padding: '0 1.2rem 1.2rem 1.2rem',
						borderTop: '1px solid var(--outline-variant)',
						paddingTop: '1rem',
					}}
				>
					{/* Reasoning */}
					{qa.reasoning && (
						<div style={{ marginBottom: '1rem' }}>
							<p
								style={{
									fontSize: '0.72rem',
									fontWeight: 700,
									textTransform: 'uppercase',
									letterSpacing: '0.08em',
									color: 'var(--text-secondary)',
									marginBottom: '0.4rem',
								}}
							>
								Reasoning
							</p>
							<p
								style={{
									fontSize: '0.87rem',
									lineHeight: 1.6,
									margin: 0,
								}}
							>
								{qa.reasoning}
							</p>
						</div>
					)}

					{/* Evidence */}
					{qa.evidence && qa.evidence.length > 0 && (
						<div style={{ marginBottom: '1rem' }}>
							<p
								style={{
									fontSize: '0.72rem',
									fontWeight: 700,
									textTransform: 'uppercase',
									letterSpacing: '0.08em',
									color: 'var(--text-secondary)',
									marginBottom: '0.6rem',
								}}
							>
								Evidence ({qa.evidence.length} citation
								{qa.evidence.length !== 1 ? 's' : ''})
							</p>
							<div
								style={{
									display: 'flex',
									flexDirection: 'column',
									gap: '0.6rem',
								}}
							>
								{qa.evidence.map((ev, i) => (
									<div
										key={i}
										style={{
											background:
												'var(--surface-container)',
											borderRadius: '8px',
											padding: '0.75rem 0.9rem',
											borderLeft:
												'3px solid var(--accent-color)',
										}}
									>
										<div
											style={{
												display: 'flex',
												justifyContent: 'space-between',
												alignItems: 'center',
												marginBottom: '0.3rem',
											}}
										>
											<span
												style={{
													fontWeight: 700,
													fontSize: '0.83rem',
												}}
											>
												{ev.agent_name ||
													`Agent #${ev.agent_id}`}
											</span>
											<span
												style={{
													fontSize: '0.7rem',
													fontWeight: 600,
													color: 'var(--accent-color)',
													background:
														'rgba(37,99,235,0.1)',
													padding: '0.1rem 0.4rem',
													borderRadius: '8px',
												}}
											>
												{Math.round(ev.weight * 100)}%
												weight
											</span>
										</div>
										<p
											style={{
												margin: 0,
												fontSize: '0.83rem',
												color: 'var(--on-surface)',
												lineHeight: 1.5,
												marginBottom: '0.35rem',
											}}
										>
											{ev.action_description}
										</p>
										<p
											style={{
												margin: 0,
												fontSize: '0.78rem',
												color: 'var(--text-secondary)',
												lineHeight: 1.4,
												fontStyle: 'italic',
											}}
										>
											→ {ev.relevance_to_answer}
										</p>
									</div>
								))}
							</div>
						</div>
					)}

					{/* Caveats */}
					{qa.caveats && (
						<div
							style={{
								display: 'flex',
								alignItems: 'flex-start',
								gap: '0.5rem',
								background: 'rgba(245,158,11,0.08)',
								borderRadius: '8px',
								padding: '0.6rem 0.8rem',
							}}
						>
							<AlertTriangle
								size={14}
								color="#f59e0b"
								style={{ flexShrink: 0, marginTop: '2px' }}
							/>
							<p
								style={{
									margin: 0,
									fontSize: '0.8rem',
									color: '#b45309',
									lineHeight: 1.5,
								}}
							>
								{qa.caveats}
							</p>
						</div>
					)}
				</div>
			)}
		</div>
	);
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function MetricsDashboard({ sessionId, isScenario }) {
	const [loading, setLoading] = useState(true);
	const [generating, setGenerating] = useState(false);
	const [data, setData] = useState(null);
	const [status, setStatus] = useState(null);
	const [error, setError] = useState(null);

	const basePath = isScenario
		? `/metrics/scenario/${sessionId}`
		: `/metrics/${sessionId}`;

	const fetchStatus = async () => {
		try {
			const res = await api.get(`${basePath}/status`);
			return res.data;
		} catch (err) {
			if (err.response?.status === 404) return { available: false };
			throw err;
		}
	};

	const fetchAll = async () => {
		const res = await api.get(basePath);
		setData(res.data);
		setStatus({
			available: res.data.available,
			generated_at: res.data.generated_at,
		});
	};

	const init = async () => {
		setLoading(true);
		setError(null);
		try {
			const s = await fetchStatus();
			setStatus(s);
			if (s.available) {
				await fetchAll();
			}
		} catch {
			setError('Failed to load metrics.');
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		if (sessionId) init();
	}, [sessionId]);

	const handleGenerate = async () => {
		setGenerating(true);
		setError(null);
		setData(null);
		try {
			await api.post(`${basePath}/generate`);
			const interval = setInterval(async () => {
				try {
					const s = await fetchStatus();
					if (s.available) {
						clearInterval(interval);
						setStatus(s);
						await fetchAll();
						setGenerating(false);
					}
				} catch {
					// ignore transient errors
				}
			}, 2500);
			setTimeout(() => {
				clearInterval(interval);
				if (generating) {
					setGenerating(false);
					setError('Analysis timed out. Please try again.');
				}
			}, 120000);
		} catch {
			setError('Failed to start analysis.');
			setGenerating(false);
		}
	};

	// ── Loading ────────────────────────────────────────────────────────────────
	if (loading) {
		return (
			<div
				style={{
					display: 'flex',
					justifyContent: 'center',
					padding: '3rem',
					color: 'var(--text-secondary)',
				}}
			>
				<RefreshCw
					size={22}
					className="animate-spin"
				/>
				<span style={{ marginLeft: '0.5rem' }}>Loading…</span>
			</div>
		);
	}

	// ── Not yet generated ──────────────────────────────────────────────────────
	if (!status?.available || !data?.available) {
		return (
			<div style={{ padding: '3rem 1rem', textAlign: 'center' }}>
				<div
					style={{
						display: 'inline-flex',
						padding: '1.1rem',
						background: 'var(--surface-container-low)',
						borderRadius: '50%',
						marginBottom: '1.1rem',
					}}
				>
					<Target
						size={32}
						color="var(--accent-color)"
					/>
				</div>
				<h3 style={{ fontSize: '1.15rem', marginBottom: '0.5rem' }}>
					No Investigation Yet
				</h3>
				<p
					style={{
						color: 'var(--text-secondary)',
						marginBottom: '1.5rem',
						fontSize: '0.88rem',
						maxWidth: '380px',
						margin: '0 auto 1.5rem',
					}}
				>
					Generate an AI-powered investigation: the system will create
					targeted questions from your objective, then answer them
					with evidence from the simulation.
				</p>
				<button
					onClick={handleGenerate}
					disabled={generating}
					className="btn"
					style={{
						display: 'inline-flex',
						alignItems: 'center',
						gap: '0.5rem',
						opacity: generating ? 0.7 : 1,
					}}
				>
					{generating ? (
						<RefreshCw
							size={15}
							className="animate-spin"
						/>
					) : (
						<Target size={15} />
					)}
					{generating ? 'Investigating…' : 'Run Investigation'}
				</button>
				{generating && (
					<p
						style={{
							marginTop: '1rem',
							fontSize: '0.8rem',
							color: 'var(--text-secondary)',
						}}
					>
						Generating questions and answering them with AI… this
						may take 30–60 seconds.
					</p>
				)}
				{error && (
					<p
						style={{
							color: 'var(--error-color)',
							marginTop: '1rem',
							fontSize: '0.85rem',
						}}
					>
						{error}
					</p>
				)}
			</div>
		);
	}

	// ── Error state inside result ─────────────────────────────────────────────
	if (data?.error) {
		return (
			<div
				style={{
					padding: '2rem',
					textAlign: 'center',
					color: 'var(--text-secondary)',
				}}
			>
				<AlertTriangle
					size={28}
					color="#f59e0b"
					style={{ marginBottom: '0.8rem' }}
				/>
				<p>{data.error}</p>
			</div>
		);
	}

	const answers = data?.answers ?? [];
	const aggregate = data?.aggregate ?? {};
	const yesCount = answers.filter((a) => a.answer === 'YES').length;
	const noCount = answers.filter((a) => a.answer === 'NO').length;
	const maybeCount = answers.filter((a) => a.answer === 'MAYBE').length;
	const avgConf = answers.length
		? answers.reduce((s, a) => s + a.confidence, 0) / answers.length
		: 0;

	// ── Full results ───────────────────────────────────────────────────────────
	return (
		<div
			style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
		>
			{/* Objective banner */}
			{data.objective && (
				<div
					style={{
						background: 'var(--surface-container-low)',
						borderRadius: '12px',
						padding: '1rem 1.2rem',
						borderLeft: '4px solid var(--accent-color)',
					}}
				>
					<p
						style={{
							fontSize: '0.7rem',
							fontWeight: 700,
							textTransform: 'uppercase',
							letterSpacing: '0.1em',
							color: 'var(--text-secondary)',
							marginBottom: '0.35rem',
						}}
					>
						Investigation Objective
					</p>
					<p
						style={{
							margin: 0,
							fontSize: '0.93rem',
							fontWeight: 500,
							lineHeight: 1.5,
						}}
					>
						{data.objective}
					</p>
				</div>
			)}

			{/* Summary stats */}
			<div
				style={{
					display: 'grid',
					gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
					gap: '0.75rem',
				}}
			>
				{[
					{
						label: 'Questions',
						value: answers.length,
						icon: Target,
						color: 'var(--accent-color)',
					},
					{
						label: 'Yes',
						value: yesCount,
						icon: CheckCircle,
						color: '#10b981',
					},
					{
						label: 'No',
						value: noCount,
						icon: XCircle,
						color: '#ef4444',
					},
					{
						label: 'Uncertain',
						value: maybeCount,
						icon: HelpCircle,
						color: '#f59e0b',
					},
					{
						label: 'Avg Confidence',
						value: `${Math.round(avgConf * 100)}%`,
						icon: Activity,
						color: 'var(--text-secondary)',
					},
					{
						label: 'Agents',
						value: aggregate.total_agents ?? '—',
						icon: Users,
						color: 'var(--text-secondary)',
					},
				].map(({ label, value, icon: Icon, color }) => (
					<div
						key={label}
						style={{
							background: 'var(--surface-container-low)',
							borderRadius: '10px',
							padding: '0.9rem',
							textAlign: 'center',
						}}
					>
						<Icon
							size={18}
							color={color}
							style={{ marginBottom: '0.35rem' }}
						/>
						<div style={{ fontSize: '1.5rem', fontWeight: 700 }}>
							{value}
						</div>
						<div
							style={{
								fontSize: '0.72rem',
								color: 'var(--text-secondary)',
								textTransform: 'uppercase',
								letterSpacing: '0.06em',
							}}
						>
							{label}
						</div>
					</div>
				))}
			</div>

			{/* Q&A cards */}
			<div>
				<div
					style={{
						display: 'flex',
						justifyContent: 'space-between',
						alignItems: 'center',
						marginBottom: '0.85rem',
					}}
				>
					<h3
						style={{
							margin: 0,
							fontSize: '0.95rem',
							fontWeight: 700,
						}}
					>
						Investigation Results
					</h3>
					<button
						onClick={handleGenerate}
						disabled={generating}
						style={{
							display: 'inline-flex',
							alignItems: 'center',
							gap: '0.35rem',
							padding: '0.35rem 0.75rem',
							background: 'transparent',
							border: '1px solid var(--outline-variant)',
							borderRadius: '6px',
							cursor: generating ? 'not-allowed' : 'pointer',
							fontSize: '0.78rem',
							color: 'var(--text-secondary)',
							opacity: generating ? 0.6 : 1,
						}}
					>
						<RefreshCw
							size={12}
							className={generating ? 'animate-spin' : ''}
						/>
						{generating ? 'Re-investigating…' : 'Re-run'}
					</button>
				</div>

				{answers.length === 0 ? (
					<p
						style={{
							color: 'var(--text-secondary)',
							fontSize: '0.88rem',
						}}
					>
						No questions were answered. Try re-running the
						investigation.
					</p>
				) : (
					<div
						style={{
							display: 'flex',
							flexDirection: 'column',
							gap: '0.75rem',
						}}
					>
						{answers.map((qa, i) => (
							<QuestionCard
								key={qa.question_id ?? i}
								qa={qa}
								index={i}
							/>
						))}
					</div>
				)}
			</div>

			{/* Footer */}
			{status?.generated_at && (
				<p
					style={{
						fontSize: '0.72rem',
						color: 'var(--outline)',
						textAlign: 'right',
						margin: 0,
					}}
				>
					Generated {new Date(status.generated_at).toLocaleString()}
				</p>
			)}
		</div>
	);
}
