import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
	CheckCircle2,
	XCircle,
	Loader,
	PlusSquare,
	UploadCloud,
	Users,
	FileText,
	Zap,
	MoreVertical,
	Trash2,
} from 'lucide-react';
import api from '../api';
import { useSidebar } from '../SidebarContext';

const STATUS_CONFIG = {
	completed: { bg: '#dcfce7', color: '#16a34a', label: 'Completed' },
	running: { bg: '#dbeafe', color: '#2563eb', label: 'Running' },
	error: { bg: '#fee2e2', color: '#dc2626', label: 'Error' },
	pending: { bg: '#fef9c3', color: '#ca8a04', label: 'Pending' },
};

function StatusPill({ status }) {
	const cfg = STATUS_CONFIG[status] || {
		bg: '#e5e7eb',
		color: '#374151',
		label: status,
	};
	return (
		<span
			style={{
				padding: '0.15rem 0.5rem',
				borderRadius: '999px',
				fontSize: '0.63rem',
				fontWeight: 700,
				background: cfg.bg,
				color: cfg.color,
				textTransform: 'uppercase',
				letterSpacing: '0.05em',
			}}
		>
			{cfg.label}
		</span>
	);
}

function StatusIcon({ status }) {
	if (status === 'completed')
		return (
			<CheckCircle2
				size={14}
				color="#16a34a"
			/>
		);
	if (status === 'error')
		return (
			<XCircle
				size={14}
				color="#dc2626"
			/>
		);
	return (
		<Loader
			size={14}
			color="#2563eb"
		/>
	);
}

function SimCard({ session, onClick, onDelete }) {
	const [menuOpen, setMenuOpen] = useState(false);

	const handleMenuToggle = (e) => {
		e.stopPropagation();
		setMenuOpen((prev) => !prev);
	};

	const handleDelete = (e) => {
		e.stopPropagation();
		setMenuOpen(false);
		const label = session.title || `Simulation #${session.id}`;
		if (
			window.confirm(
				`Delete "${label}"?\n\nThis will permanently remove all session data, seed files, and generated outputs.`,
			)
		) {
			onDelete(session.session_id);
		}
	};

	return (
		<div style={{ position: 'relative' }}>
			{/* Card */}
			<div
				onClick={onClick}
				style={{
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'flex-start',
					gap: '0.6rem',
					padding: '1rem',
					background: 'var(--surface-container-lowest)',
					border: '1px solid var(--outline-variant)',
					borderRadius: '12px',
					cursor: 'pointer',
					textAlign: 'left',
					transition:
						'box-shadow 0.15s ease, border-color 0.15s ease',
					width: '100%',
					boxSizing: 'border-box',
				}}
				onMouseEnter={(e) => {
					e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
					e.currentTarget.style.borderColor = 'var(--outline)';
				}}
				onMouseLeave={(e) => {
					e.currentTarget.style.boxShadow = 'none';
					e.currentTarget.style.borderColor =
						'var(--outline-variant)';
				}}
			>
				{/* Top row: icon + status */}
				<div
					style={{
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'space-between',
						width: '100%',
					}}
				>
					<div
						style={{
							width: 30,
							height: 30,
							borderRadius: '8px',
							background: 'var(--surface-container-high)',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
						}}
					>
						<StatusIcon status={session.status} />
					</div>
					<StatusPill status={session.status} />
				</div>

				{/* Title */}
				<p
					style={{
						margin: 0,
						fontWeight: 600,
						fontSize: '0.85rem',
						color: 'var(--on-surface)',
						lineHeight: 1.35,
						overflow: 'hidden',
						display: '-webkit-box',
						WebkitLineClamp: 2,
						WebkitBoxOrient: 'vertical',
					}}
				>
					{session.title || `Simulation #${session.id}`}
				</p>

				{/* Bottom row: date + 3-dot menu */}
				<div
					style={{
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'space-between',
						width: '100%',
						marginTop: 'auto',
					}}
				>
					{session.created_at ? (
						<p
							style={{
								margin: 0,
								fontSize: '0.7rem',
								color: 'var(--text-secondary)',
							}}
						>
							{new Date(session.created_at).toLocaleDateString(
								undefined,
								{
									month: 'short',
									day: 'numeric',
									year: 'numeric',
								},
							)}
						</p>
					) : (
						<span />
					)}

					{/* 3-dot menu trigger */}
					<button
						onClick={handleMenuToggle}
						title="Options"
						style={{
							background: 'transparent',
							border: 'none',
							borderRadius: '6px',
							padding: '0.2rem',
							cursor: 'pointer',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							color: 'var(--text-secondary)',
							flexShrink: 0,
						}}
					>
						<MoreVertical size={14} />
					</button>
				</div>
			</div>

			{/* Dropdown */}
			{menuOpen && (
				<>
					<div
						style={{
							position: 'fixed',
							inset: 0,
							zIndex: 99,
						}}
						onClick={() => setMenuOpen(false)}
					/>
					<div
						style={{
							position: 'absolute',
							bottom: '2.2rem',
							right: '0.5rem',
							zIndex: 100,
							background: 'var(--surface-container)',
							border: '1px solid var(--outline-variant)',
							borderRadius: '8px',
							boxShadow: 'var(--shadow-lg)',
							minWidth: '130px',
							overflow: 'hidden',
						}}
					>
						<button
							onClick={handleDelete}
							style={{
								display: 'flex',
								alignItems: 'center',
								gap: '0.5rem',
								width: '100%',
								padding: '0.55rem 0.85rem',
								background: 'transparent',
								border: 'none',
								cursor: 'pointer',
								fontSize: '0.82rem',
								color: '#dc2626',
								textAlign: 'left',
							}}
							onMouseEnter={(e) =>
								(e.currentTarget.style.background = '#fee2e2')
							}
							onMouseLeave={(e) =>
								(e.currentTarget.style.background =
									'transparent')
							}
						>
							<Trash2 size={13} />
							Delete
						</button>
					</div>
				</>
			)}
		</div>
	);
}

export default function Simulations() {
	const [sessions, setSessions] = useState([]);
	const [loading, setLoading] = useState(true);
	const navigate = useNavigate();
	const { setNewSimOpen } = useSidebar();

	useEffect(() => {
		api.get('/sessions/')
			.then((res) => setSessions(res.data))
			.catch(() => {})
			.finally(() => setLoading(false));
	}, []);

	const handleDelete = async (sessionId) => {
		try {
			await api.delete(`/sessions/${sessionId}`);
			setSessions((prev) =>
				prev.filter((s) => s.session_id !== sessionId),
			);
		} catch (err) {
			console.error('Delete failed', err);
			alert('Failed to delete simulation. Please try again.');
		}
	};

	return (
		<div
			className="fade-in"
			style={{ minHeight: '100%' }}
		>
			<div
				style={{
					maxWidth: '1100px',
					margin: '0 auto',
					padding: '2rem 1.5rem',
				}}
			>
				{/* ── Header ───────────────────────────────────────── */}
				<div
					style={{
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'space-between',
						marginBottom: '2rem',
					}}
				>
					<div>
						<h1
							style={{
								margin: 0,
								fontSize: '1.6rem',
								fontWeight: 700,
								letterSpacing: '-0.02em',
								color: 'var(--on-surface)',
							}}
						>
							Simulations
						</h1>
						<p
							style={{
								margin: '0.25rem 0 0',
								fontSize: '0.82rem',
								color: 'var(--text-secondary)',
							}}
						>
							{sessions.length > 0
								? `${sessions.length} simulation${sessions.length !== 1 ? 's' : ''}`
								: 'No simulations yet'}
						</p>
					</div>
					<button
						className="btn"
						onClick={() => setNewSimOpen(true)}
						style={{
							display: 'flex',
							alignItems: 'center',
							gap: '0.45rem',
						}}
					>
						<PlusSquare size={15} />
						New Simulation
					</button>
				</div>

				{/* ── Grid ─────────────────────────────────────────── */}
				{loading ? (
					<div
						style={{
							display: 'flex',
							justifyContent: 'center',
							padding: '4rem 0',
							color: 'var(--text-secondary)',
						}}
					>
						<Loader size={22} />
					</div>
				) : sessions.length === 0 ? (
					<div
						style={{
							padding: '3.5rem',
							textAlign: 'center',
							border: '1.5px dashed var(--outline-variant)',
							borderRadius: '14px',
							color: 'var(--text-secondary)',
							marginBottom: '3rem',
						}}
					>
						<PlusSquare
							size={28}
							style={{ marginBottom: '0.75rem', opacity: 0.4 }}
						/>
						<p
							style={{
								margin: 0,
								fontWeight: 600,
								fontSize: '0.9rem',
							}}
						>
							No simulations yet
						</p>
						<p
							style={{
								margin: '0.35rem 0 1rem',
								fontSize: '0.8rem',
							}}
						>
							Create your first simulation to get started.
						</p>
						<button
							className="btn"
							onClick={() => setNewSimOpen(true)}
							style={{ gap: '0.4rem' }}
						>
							<PlusSquare size={14} /> New Simulation
						</button>
					</div>
				) : (
					<div
						style={{
							display: 'grid',
							gridTemplateColumns:
								'repeat(auto-fill, minmax(210px, 1fr))',
							gap: '0.85rem',
							marginBottom: '3.5rem',
						}}
					>
						{sessions.map((s) => (
							<SimCard
								key={s.id}
								session={s}
								onClick={() =>
									navigate(`/session/${s.session_id}`)
								}
								onDelete={handleDelete}
							/>
						))}
					</div>
				)}

				{/* ── About section ─────────────────────────────────── */}
				<div
					style={{
						borderTop: '1px solid var(--outline-variant)',
						paddingTop: '2.5rem',
					}}
				>
					<p
						style={{
							fontSize: '0.68rem',
							fontWeight: 700,
							letterSpacing: '0.1em',
							textTransform: 'uppercase',
							color: 'var(--outline)',
							marginBottom: '1.25rem',
						}}
					>
						About Simulations
					</p>

					<div
						style={{
							display: 'grid',
							gridTemplateColumns:
								'repeat(auto-fill, minmax(220px, 1fr))',
							gap: '1rem',
						}}
					>
						{[
							{
								icon: UploadCloud,
								title: 'Upload Seed Documents',
								body: 'Drop in reports, papers, briefs, or notes as the starting context for the simulation.',
							},
							{
								icon: Users,
								title: 'Agents Deliberate',
								body: 'A configurable team of AI agents reads, challenges, and synthesizes your material across multiple rounds.',
							},
							{
								icon: Zap,
								title: 'Multi-Round Reasoning',
								body: 'Each round pushes agents to refine arguments, surface tensions, and identify blind spots.',
							},
							{
								icon: FileText,
								title: 'Structured Report',
								body: 'Receive a structured report capturing insights, agreements, tensions, and conclusions.',
							},
						].map((item) => {
							const Icon = item.icon;
							return (
								<div
									key={item.title}
									style={{
										display: 'flex',
										gap: '0.85rem',
										alignItems: 'flex-start',
										padding: '1rem',
										background:
											'var(--surface-container-low)',
										borderRadius: '12px',
									}}
								>
									<div
										style={{
											width: 32,
											height: 32,
											borderRadius: '8px',
											background:
												'var(--surface-container-high)',
											display: 'flex',
											alignItems: 'center',
											justifyContent: 'center',
											flexShrink: 0,
										}}
									>
										<Icon
											size={15}
											color="var(--accent-color)"
										/>
									</div>
									<div>
										<p
											style={{
												margin: 0,
												fontWeight: 600,
												fontSize: '0.82rem',
											}}
										>
											{item.title}
										</p>
										<p
											style={{
												margin: '0.25rem 0 0',
												fontSize: '0.75rem',
												color: 'var(--text-secondary)',
												lineHeight: 1.5,
											}}
										>
											{item.body}
										</p>
									</div>
								</div>
							);
						})}
					</div>
				</div>
			</div>
		</div>
	);
}
