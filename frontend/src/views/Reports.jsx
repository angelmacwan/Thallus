import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import api from '../api';
import { FileText, RefreshCw, X, Trash2, Plus } from 'lucide-react';
import mermaid from 'mermaid';

mermaid.initialize({ startOnLoad: false, theme: 'neutral' });

// ─── Mermaid diagram renderer ─────────────────────────────────────────────────
function MermaidBlock({ code }) {
	const ref = useRef(null);
	const idRef = useRef(`mermaid-${Math.random().toString(36).slice(2)}`);

	useEffect(() => {
		if (!ref.current) return;
		mermaid
			.render(idRef.current, code)
			.then(({ svg }) => {
				if (ref.current) ref.current.innerHTML = svg;
			})
			.catch(() => {
				if (ref.current)
					ref.current.innerHTML = `<pre style="font-size:0.78rem;color:#666">${code}</pre>`;
			});
	}, [code]);

	return (
		<div
			ref={ref}
			style={{
				overflowX: 'auto',
				margin: '1rem 0',
				padding: '1rem',
				background: 'var(--surface-container-low)',
				borderRadius: '10px',
				border: '1px solid var(--outline-variant)',
			}}
		/>
	);
}

// ─── Inline report panel ──────────────────────────────────────────────────────
function ReportPanel({ report, onClose }) {
	const [content, setContent] = useState(null);
	const [loadingContent, setLoadingContent] = useState(true);
	const [error, setError] = useState(null);

	useEffect(() => {
		setContent(null);
		setLoadingContent(true);
		setError(null);
		api.get(`/reports/${report.report_id}/content`, {
			responseType: 'text',
			transformResponse: [(data) => data],
		})
			.then((res) => setContent(res.data))
			.catch(() => setError('Could not load report content.'))
			.finally(() => setLoadingContent(false));
	}, [report.report_id]);

	const components = {
		code({ node, inline, className, children, ...props }) {
			const lang = (className || '').replace('language-', '');
			if (!inline && lang === 'mermaid') {
				return <MermaidBlock code={String(children).trim()} />;
			}
			return inline ? (
				<code
					style={{
						background: 'var(--surface-container)',
						padding: '0.1em 0.35em',
						borderRadius: '4px',
						fontSize: '0.85em',
					}}
					{...props}
				>
					{children}
				</code>
			) : (
				<pre
					style={{
						background: 'var(--surface-container)',
						padding: '1rem',
						borderRadius: '8px',
						overflowX: 'auto',
						fontSize: '0.82rem',
						lineHeight: 1.6,
					}}
				>
					<code {...props}>{children}</code>
				</pre>
			);
		},
	};

	return (
		<div
			style={{
				display: 'flex',
				flexDirection: 'column',
				height: '100%',
				background: 'var(--surface)',
				borderRadius: '12px',
				border: '1px solid var(--outline-variant)',
				overflow: 'hidden',
			}}
		>
			{/* Header */}
			<div
				style={{
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'space-between',
					padding: '1rem 1.25rem',
					borderBottom: '1px solid var(--outline-variant)',
					flexShrink: 0,
					gap: '0.75rem',
				}}
			>
				<div
					style={{
						display: 'flex',
						alignItems: 'center',
						gap: '0.55rem',
						minWidth: 0,
					}}
				>
					<FileText
						size={16}
						color="var(--accent-color)"
						style={{ flexShrink: 0 }}
					/>
					<div style={{ minWidth: 0 }}>
						<div
							style={{
								fontWeight: 700,
								fontSize: '0.9rem',
								overflow: 'hidden',
								textOverflow: 'ellipsis',
								whiteSpace: 'nowrap',
							}}
						>
							{report.title}
						</div>
						{report.session_title && (
							<div
								style={{
									fontSize: '0.7rem',
									color: 'var(--text-secondary)',
									marginTop: '0.1rem',
									whiteSpace: 'nowrap',
									overflow: 'hidden',
									textOverflow: 'ellipsis',
								}}
							>
								{report.session_title}
							</div>
						)}
					</div>
				</div>
				<button
					onClick={onClose}
					style={{
						background: 'none',
						border: 'none',
						cursor: 'pointer',
						color: 'var(--text-secondary)',
						padding: '0.3rem',
						borderRadius: '6px',
						flexShrink: 0,
						display: 'flex',
						alignItems: 'center',
					}}
					title="Close panel"
				>
					<X size={16} />
				</button>
			</div>

			{/* Scrollable content */}
			<div
				style={{
					flex: 1,
					overflowY: 'auto',
					padding: '1.5rem 2rem',
				}}
			>
				{loadingContent ? (
					<div
						style={{
							textAlign: 'center',
							padding: '4rem 2rem',
							color: 'var(--text-secondary)',
						}}
					>
						<RefreshCw
							size={22}
							style={{
								animation: 'spin 1.4s linear infinite',
								marginBottom: '0.75rem',
							}}
						/>
						<p>Loading report…</p>
					</div>
				) : error ? (
					<div
						style={{
							color: 'var(--danger-color)',
							padding: '1rem',
						}}
					>
						{error}
					</div>
				) : (
					<div
						style={{
							lineHeight: 1.8,
							fontSize: '0.9rem',
							color: 'var(--text-primary)',
						}}
					>
						<ReactMarkdown
							remarkPlugins={[remarkGfm]}
							components={components}
						>
							{content}
						</ReactMarkdown>
					</div>
				)}
			</div>

			{/* Footer */}
			<div
				style={{
					padding: '0.7rem 1.25rem',
					borderTop: '1px solid var(--outline-variant)',
					flexShrink: 0,
					fontSize: '0.7rem',
					color: 'var(--text-secondary)',
				}}
			>
				Generated {new Date(report.created_at).toLocaleString()}
			</div>
		</div>
	);
}

// ─── Generate Report Modal ───────────────────────────────────────────────────
function GenerateReportModal({ onClose, onCreated }) {
	const [sessions, setSessions] = useState([]);
	const [loadingSessions, setLoadingSessions] = useState(true);
	const [selectedSession, setSelectedSession] = useState('');
	const [description, setDescription] = useState('');
	const [generating, setGenerating] = useState(false);
	const [error, setError] = useState(null);

	useEffect(() => {
		api.get('/sessions/')
			.then((res) => {
				const completed = res.data.filter(
					(s) => s.status === 'completed',
				);
				setSessions(completed);
				if (completed.length > 0)
					setSelectedSession(completed[0].session_id);
			})
			.catch(() => {})
			.finally(() => setLoadingSessions(false));
	}, []);

	const handleSubmit = async (e) => {
		e.preventDefault();
		if (!selectedSession || !description.trim()) return;
		setGenerating(true);
		setError(null);
		try {
			const res = await api.post(`/reports/generate/${selectedSession}`, {
				description: description.trim(),
			});
			onCreated(res.data);
			onClose();
		} catch (err) {
			setError(
				err?.response?.data?.detail || 'Failed to generate report.',
			);
		} finally {
			setGenerating(false);
		}
	};

	return (
		<div
			style={{
				position: 'fixed',
				inset: 0,
				background: 'rgba(0,0,0,0.45)',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				zIndex: 1000,
				padding: '1rem',
			}}
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
		>
			<div
				style={{
					background: 'var(--surface)',
					borderRadius: '14px',
					padding: '2rem',
					width: '100%',
					maxWidth: '560px',
					display: 'flex',
					flexDirection: 'column',
					gap: '1.25rem',
					boxShadow: '0 8px 32px rgba(0,0,0,0.22)',
					border: '1px solid var(--outline-variant)',
				}}
			>
				{/* Header */}
				<div
					style={{
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'space-between',
					}}
				>
					<div
						style={{
							display: 'flex',
							alignItems: 'center',
							gap: '0.6rem',
						}}
					>
						<FileText
							size={20}
							color="var(--accent-color)"
						/>
						<h3 style={{ margin: 0, fontSize: '1rem' }}>
							Generate Report
						</h3>
					</div>
					<button
						onClick={onClose}
						style={{
							background: 'none',
							border: 'none',
							cursor: 'pointer',
							color: 'var(--text-secondary)',
							display: 'flex',
							padding: '0.25rem',
							borderRadius: '6px',
						}}
					>
						<X size={18} />
					</button>
				</div>

				<p
					style={{
						margin: 0,
						fontSize: '0.85rem',
						color: 'var(--text-secondary)',
						lineHeight: 1.6,
					}}
				>
					Describe the focus or question for this report. The agent
					will use the simulation data, knowledge graph, insights, and
					chat history to produce an enterprise-grade Markdown report.
				</p>

				<form
					onSubmit={handleSubmit}
					style={{
						display: 'flex',
						flexDirection: 'column',
						gap: '1rem',
					}}
				>
					{/* Session picker */}
					<div>
						<label
							style={{
								fontSize: '0.78rem',
								fontWeight: 600,
								color: 'var(--text-secondary)',
								display: 'block',
								marginBottom: '0.35rem',
							}}
						>
							Simulation
						</label>
						{loadingSessions ? (
							<div
								style={{
									fontSize: '0.82rem',
									color: 'var(--text-secondary)',
								}}
							>
								Loading simulations…
							</div>
						) : sessions.length === 0 ? (
							<div
								style={{
									fontSize: '0.82rem',
									color: 'var(--danger-color)',
								}}
							>
								No completed simulations found. Run a simulation
								first.
							</div>
						) : (
							<select
								className="input-field"
								value={selectedSession}
								onChange={(e) =>
									setSelectedSession(e.target.value)
								}
								disabled={generating}
								style={{ width: '100%' }}
							>
								{sessions.map((s) => (
									<option
										key={s.session_id}
										value={s.session_id}
									>
										{s.title || s.session_id}
									</option>
								))}
							</select>
						)}
					</div>

					{/* Description */}
					<div>
						<label
							style={{
								fontSize: '0.78rem',
								fontWeight: 600,
								color: 'var(--text-secondary)',
								display: 'block',
								marginBottom: '0.35rem',
							}}
						>
							Report Focus
						</label>
						<textarea
							className="input-field"
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							placeholder="e.g. Analyse information spread patterns and identify key influencers…"
							rows={5}
							disabled={generating}
							style={{
								resize: 'vertical',
								fontFamily: 'inherit',
								fontSize: '0.88rem',
								lineHeight: 1.6,
								width: '100%',
								boxSizing: 'border-box',
							}}
						/>
					</div>

					{error && (
						<div
							style={{
								padding: '0.65rem 0.85rem',
								background: 'rgba(220,38,38,0.08)',
								border: '1px solid rgba(220,38,38,0.2)',
								borderRadius: '8px',
								color: 'var(--danger-color)',
								fontSize: '0.82rem',
							}}
						>
							{error}
						</div>
					)}

					<div
						style={{
							display: 'flex',
							gap: '0.75rem',
							justifyContent: 'flex-end',
						}}
					>
						<button
							type="button"
							className="btn btn-secondary"
							onClick={onClose}
							disabled={generating}
						>
							Cancel
						</button>
						<button
							type="submit"
							className="btn"
							disabled={
								generating ||
								!description.trim() ||
								!selectedSession ||
								sessions.length === 0
							}
							style={{
								display: 'flex',
								alignItems: 'center',
								gap: '0.45rem',
							}}
						>
							{generating ? (
								<>
									<RefreshCw
										size={14}
										style={{
											animation:
												'spin 1.4s linear infinite',
										}}
									/>{' '}
									Generating…
								</>
							) : (
								<>
									<FileText size={14} /> Generate Report
								</>
							)}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}

// ─── Main Reports page ────────────────────────────────────────────────────────
export default function Reports() {
	const [reports, setReports] = useState([]);
	const [loading, setLoading] = useState(true);
	const [selected, setSelected] = useState(null);
	const [deleting, setDeleting] = useState(null);
	const [panelVisible, setPanelVisible] = useState(false);
	const [showGenModal, setShowGenModal] = useState(false);

	useEffect(() => {
		api.get('/reports/')
			.then((res) => setReports(res.data))
			.catch(console.error)
			.finally(() => setLoading(false));
	}, []);

	const handleReportCreated = (newReport) => {
		setReports((prev) => [newReport, ...prev]);
		handleSelect(newReport);
	};

	const handleSelect = (r) => {
		setSelected(r);
		// Small tick so the panel mounts before the CSS transition fires
		requestAnimationFrame(() => setPanelVisible(true));
	};

	const handleClose = () => {
		setPanelVisible(false);
		setTimeout(() => setSelected(null), 280);
	};

	const handleDelete = async (e, report) => {
		e.stopPropagation();
		if (!confirm(`Delete report "${report.title}"? This cannot be undone.`))
			return;
		setDeleting(report.report_id);
		try {
			await api.delete(`/reports/${report.report_id}`);
			setReports((prev) =>
				prev.filter((r) => r.report_id !== report.report_id),
			);
			if (selected?.report_id === report.report_id) handleClose();
		} catch {
			alert('Failed to delete report.');
		} finally {
			setDeleting(null);
		}
	};

	if (loading) {
		return (
			<div
				style={{
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					height: '100%',
					color: 'var(--text-secondary)',
					flexDirection: 'column',
					gap: '1rem',
				}}
			>
				<style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
				<RefreshCw
					size={26}
					style={{ animation: 'spin 1.4s linear infinite' }}
				/>
				<p>Loading reports…</p>
			</div>
		);
	}

	return (
		<div
			className="fade-in"
			style={{
				display: 'flex',
				gap: '1.25rem',
				height: '100%',
				overflow: 'hidden',
			}}
		>
			<style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>

			{/* ── Left: list ── */}
			<div
				style={{
					display: 'flex',
					flexDirection: 'column',
					gap: '1rem',
					width: selected ? '320px' : '100%',
					flexShrink: 0,
					transition: 'width 0.28s cubic-bezier(0.4,0,0.2,1)',
					overflowY: 'auto',
					minHeight: 0,
				}}
			>
				<div
					style={{
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'space-between',
						flexShrink: 0,
					}}
				>
					<h2 style={{ margin: 0 }}>Reports</h2>
					<button
						className="btn"
						onClick={() => setShowGenModal(true)}
						style={{
							display: 'flex',
							alignItems: 'center',
							gap: '0.4rem',
							fontSize: '0.82rem',
							padding: '0.45rem 0.85rem',
						}}
					>
						<Plus size={14} />
						Generate Report
					</button>
				</div>

				{reports.length === 0 ? (
					<div
						className="card"
						style={{
							display: 'flex',
							flexDirection: 'column',
							alignItems: 'center',
							justifyContent: 'center',
							padding: '4rem 2rem',
							textAlign: 'center',
							gap: '1rem',
						}}
					>
						<div
							style={{
								width: 64,
								height: 64,
								borderRadius: '16px',
								background: 'var(--surface-container)',
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
							}}
						>
							<FileText
								size={28}
								color="var(--secondary)"
							/>
						</div>
						<h3
							style={{
								margin: 0,
								color: 'var(--text-secondary)',
							}}
						>
							No reports yet
						</h3>
						<p
							style={{
								color: 'var(--text-secondary)',
								maxWidth: '360px',
								lineHeight: 1.7,
								margin: 0,
							}}
						>
							Open a completed simulation and click{' '}
							<strong>Generate Report</strong> in the sidebar to
							create your first report.
						</p>
					</div>
				) : (
					<div
						style={{
							display: 'flex',
							flexDirection: 'column',
							gap: '0.5rem',
						}}
					>
						{reports.map((r) => {
							const isActive =
								selected?.report_id === r.report_id;
							return (
								<div
									key={r.report_id}
									className="card"
									onClick={() => handleSelect(r)}
									style={{
										cursor: 'pointer',
										padding: '0.85rem 1rem',
										display: 'flex',
										alignItems: 'center',
										gap: '0.85rem',
										transition:
											'box-shadow 0.15s, background 0.15s',
										background: isActive
											? 'var(--surface-container)'
											: undefined,
										borderColor: isActive
											? 'var(--accent-color)'
											: undefined,
									}}
								>
									{/* Icon */}
									<div
										style={{
											width: 34,
											height: 34,
											borderRadius: '8px',
											background: isActive
												? 'var(--accent-color)'
												: 'var(--surface-container)',
											display: 'flex',
											alignItems: 'center',
											justifyContent: 'center',
											flexShrink: 0,
											transition: 'background 0.15s',
										}}
									>
										<FileText
											size={15}
											color={
												isActive
													? '#fff'
													: 'var(--accent-color)'
											}
										/>
									</div>

									{/* Text */}
									<div style={{ flex: 1, minWidth: 0 }}>
										<div
											style={{
												fontWeight: 600,
												fontSize: '0.88rem',
												overflow: 'hidden',
												textOverflow: 'ellipsis',
												whiteSpace: 'nowrap',
											}}
										>
											{r.title}
										</div>
										<div
											style={{
												fontSize: '0.73rem',
												color: 'var(--text-secondary)',
												overflow: 'hidden',
												textOverflow: 'ellipsis',
												whiteSpace: 'nowrap',
												marginTop: '0.1rem',
											}}
										>
											{r.session_title
												? `${r.session_title} · `
												: ''}
											{new Date(
												r.created_at,
											).toLocaleDateString(undefined, {
												month: 'short',
												day: 'numeric',
												year: 'numeric',
											})}
										</div>
									</div>

									{/* Delete */}
									<button
										onClick={(e) => handleDelete(e, r)}
										disabled={deleting === r.report_id}
										style={{
											background: 'none',
											border: 'none',
											cursor: 'pointer',
											color: 'var(--text-secondary)',
											padding: '0.25rem',
											borderRadius: '6px',
											flexShrink: 0,
											display: 'flex',
											alignItems: 'center',
										}}
										title="Delete report"
									>
										{deleting === r.report_id ? (
											<RefreshCw
												size={13}
												style={{
													animation:
														'spin 1.4s linear infinite',
												}}
											/>
										) : (
											<Trash2 size={13} />
										)}
									</button>
								</div>
							);
						})}
					</div>
				)}
			</div>

			{showGenModal && (
				<GenerateReportModal
					onClose={() => setShowGenModal(false)}
					onCreated={handleReportCreated}
				/>
			)}

			{/* ── Right: report panel ── */}
			{selected && (
				<div
					style={{
						flex: 1,
						minWidth: 0,
						height: '100%',
						transform: panelVisible
							? 'translateX(0)'
							: 'translateX(40px)',
						opacity: panelVisible ? 1 : 0,
						transition:
							'transform 0.28s cubic-bezier(0.4,0,0.2,1), opacity 0.28s ease',
					}}
				>
					<ReportPanel
						report={selected}
						onClose={handleClose}
					/>
				</div>
			)}
		</div>
	);
}
