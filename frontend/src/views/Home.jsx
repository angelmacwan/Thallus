import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import {
	PlayCircle,
	FileText,
	UploadCloud,
	Zap,
	Target,
	BookOpen,
	Briefcase,
	GraduationCap,
} from 'lucide-react';

export default function Home() {
	const [sessions, setSessions] = useState([]);
	const [loading, setLoading] = useState(true);
	const navigate = useNavigate();

	useEffect(() => {
		fetchSessions();
	}, []);

	const fetchSessions = async () => {
		try {
			const res = await api.get('/sessions/');
			setSessions(res.data);
		} catch (err) {
			console.error('Failed to fetch sessions', err);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div
			className="fade-in"
			style={{ height: '100%' }}
		>
			{/* ── Left: Simulation list ─────────────────────────────── */}
			<section>
				<h1 style={{ marginBottom: '1.25rem' }}>Your Simulations</h1>

				{loading ? (
					<p style={{ color: 'var(--text-secondary)' }}>Loading…</p>
				) : sessions.length === 0 ? (
					<div
						className="card"
						style={{ textAlign: 'center', padding: '3rem' }}
					>
						<FileText
							size={44}
							color="var(--text-secondary)"
							style={{ marginBottom: '1rem' }}
						/>
						<h3 style={{ color: 'var(--text-secondary)' }}>
							No simulations yet
						</h3>
						<p
							style={{
								color: 'var(--text-secondary)',
								marginTop: '0.4rem',
							}}
						>
							Initialize your first engine on the right.
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
						{sessions.map((s) => {
							const chipClass =
								s.status === 'completed'
									? 'chip-completed'
									: s.status === 'error'
										? 'chip-error'
										: 'chip-running';

							return (
								<div
									className="card"
									key={s.id}
									style={{
										display: 'flex',
										alignItems: 'center',
										gap: '1rem',
										cursor: 'pointer',
										padding: '0.9rem 1.1rem',
									}}
									onClick={() =>
										navigate(`/session/${s.session_id}`)
									}
								>
									<PlayCircle
										size={18}
										color="var(--text-secondary)"
										style={{ flexShrink: 0 }}
									/>

									<div style={{ flex: 1, minWidth: 0 }}>
										<span
											style={{
												fontWeight: 600,
												display: 'block',
												fontSize: '0.95rem',
											}}
										>
											{s.title || `Simulation #${s.id}`}
										</span>
										<div
											style={{
												display: 'flex',
												alignItems: 'center',
												gap: '0.5rem',
												marginTop: '0.25rem',
												flexWrap: 'wrap',
											}}
										>
											<span
												className={`chip ${chipClass}`}
											>
												{s.status}
											</span>
											<span
												style={{
													fontSize: '0.75rem',
													color: 'var(--text-secondary)',
												}}
											>
												{s.rounds ?? '—'} rounds
											</span>
											<span
												style={{
													fontSize: '0.75rem',
													color: 'var(--outline)',
												}}
											>
												·
											</span>
											<span
												style={{
													fontSize: '0.75rem',
													color: 'var(--text-secondary)',
												}}
											>
												{new Date(
													s.created_at,
												).toLocaleDateString(
													undefined,
													{
														year: 'numeric',
														month: 'short',
														day: 'numeric',
													},
												)}
											</span>
										</div>
									</div>
								</div>
							);
						})}
					</div>
				)}
				{/* ── How it works ──────────────────────────────────── */}
				<div style={{ marginTop: '2.5rem' }}>
					<h3
						style={{
							marginBottom: '1rem',
							fontSize: '0.75rem',
							letterSpacing: '0.1em',
							textTransform: 'uppercase',
							color: 'var(--text-secondary)',
							fontWeight: 600,
						}}
					>
						How it works
					</h3>
					<div
						style={{
							display: 'grid',
							gridTemplateColumns: 'repeat(3, 1fr)',
							gap: '0.75rem',
						}}
					>
						{[
							{
								icon: UploadCloud,
								step: '01',
								title: 'Upload Seeds',
								body: 'Drop in documents—reports, papers, briefs, or notes—as the starting context for your simulation.',
							},
							{
								icon: Zap,
								step: '02',
								title: 'Agents Deliberate',
								body: 'AI agents read, challenge, and synthesize your material across multiple reasoning rounds.',
							},
							{
								icon: FileText,
								step: '03',
								title: 'Get a Report',
								body: 'Receive a structured report capturing insights, tensions, and conclusions from the session.',
							},
						].map(({ icon: Icon, step, title, body }) => (
							<div
								key={step}
								style={{
									background: 'var(--surface-container-high)',
									borderRadius: '12px',
									padding: '1.1rem',
									display: 'flex',
									flexDirection: 'column',
									gap: '0.6rem',
								}}
							>
								<div
									style={{
										display: 'flex',
										alignItems: 'center',
										gap: '0.5rem',
									}}
								>
									<Icon
										size={15}
										color="var(--accent-color)"
									/>
									<span
										style={{
											fontSize: '0.65rem',
											fontWeight: 700,
											letterSpacing: '0.08em',
											color: 'var(--accent-color)',
											opacity: 0.8,
										}}
									>
										STEP {step}
									</span>
								</div>
								<p
									style={{
										fontWeight: 600,
										fontSize: '0.88rem',
										margin: 0,
									}}
								>
									{title}
								</p>
								<p
									style={{
										fontSize: '0.78rem',
										color: 'var(--text-secondary)',
										margin: 0,
										lineHeight: 1.5,
									}}
								>
									{body}
								</p>
							</div>
						))}
					</div>

					{/* ── Useful for ──────────────────────────────────────── */}
					<h3
						style={{
							marginTop: '1.75rem',
							marginBottom: '1rem',
							fontSize: '0.75rem',
							letterSpacing: '0.1em',
							textTransform: 'uppercase',
							color: 'var(--text-secondary)',
							fontWeight: 600,
						}}
					>
						Useful for
					</h3>
					<div
						style={{
							display: 'grid',
							gridTemplateColumns: 'repeat(2, 1fr)',
							gap: '0.75rem',
						}}
					>
						{[
							{
								icon: Target,
								title: 'Strategic Planning',
								body: 'Model how stakeholders might react to a policy shift, market move, or product decision before you commit.',
							},
							{
								icon: BookOpen,
								title: 'Research Synthesis',
								body: 'Feed competing papers or reports. The engine surfaces tensions, agreements, and blind spots across sources.',
							},
							{
								icon: Briefcase,
								title: 'Consulting & Briefings',
								body: 'Turn dense client briefs into structured deliberation sessions and export polished reports.',
							},
							{
								icon: GraduationCap,
								title: 'Education & Training',
								body: 'Simulate expert panels on any topic to create rich learning materials or stress-test arguments.',
							},
						].map(({ icon: Icon, title, body }) => (
							<div
								key={title}
								style={{
									background: 'var(--surface-container-high)',
									borderRadius: '12px',
									padding: '1.1rem',
									display: 'flex',
									flexDirection: 'column',
									gap: '0.5rem',
								}}
							>
								<Icon
									size={16}
									color="var(--accent-color)"
								/>
								<p
									style={{
										fontWeight: 600,
										fontSize: '0.88rem',
										margin: 0,
									}}
								>
									{title}
								</p>
								<p
									style={{
										fontSize: '0.78rem',
										color: 'var(--text-secondary)',
										margin: 0,
										lineHeight: 1.5,
									}}
								>
									{body}
								</p>
							</div>
						))}
					</div>
				</div>
			</section>
		</div>
	);
}
