import React, { useState, useEffect, useRef } from 'react';
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
	const [title, setTitle] = useState('');
	const [files, setFiles] = useState([]);
	const [rounds, setRounds] = useState(3);
	const [agentSlider, setAgentSlider] = useState(0); // 0-4, default 0 (natural agent generation)
	const [uploading, setUploading] = useState(false);
	const [dragging, setDragging] = useState(false);
	const fileInputRef = useRef(null);
	const navigate = useNavigate();

	const [appVersion, setAppVersion] = useState('');

	useEffect(() => {
		fetchSessions();
		api.get('/version')
			.then((res) => setAppVersion(res.data.version))
			.catch(() => { });
	}, []);

	// Map slider position (0-4) to agent count
	// 0 = natural generation (no forced inflation)
	const getAgentCount = (sliderValue) => {
		const counts = [0, 50, 150, 300, 500];
		return counts[sliderValue];
	};

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

	const handleCreate = async (e) => {
		e.preventDefault();
		if (!files.length)
			return alert('Please drop or select files to upload');
		setUploading(true);

		try {
			const formData = new FormData();
			formData.append('rounds', rounds);
			const agentCount = getAgentCount(agentSlider);
			if (agentCount > 0) {
				formData.append('agent_count', agentCount);
			}
			if (title.trim()) formData.append('title', title.trim());
			Array.from(files).forEach((file) => {
				formData.append('files', file);
			});

			const res = await api.post('/simulation/upload', formData, {
				headers: { 'Content-Type': 'multipart/form-data' },
			});
			navigate(`/session/${res.data.session_id}`);
		} catch (err) {
			console.error('Upload failed', err);
			alert('Upload failed. See console.');
		} finally {
			setUploading(false);
		}
	};

	const handleDrop = (e) => {
		e.preventDefault();
		setDragging(false);
		const dropped = Array.from(e.dataTransfer.files);
		if (dropped.length) setFiles(dropped);
	};

	const handleDragOver = (e) => {
		e.preventDefault();
		setDragging(true);
	};

	const handleDragLeave = () => setDragging(false);

	return (
		<div
			className="fade-in"
			style={{
				display: 'grid',
				gridTemplateColumns: '1fr 340px',
				gap: '2rem',
				alignItems: 'start',
				height: '100%',
			}}
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

			{/* ── Right: New simulation panel ───────────────────────── */}
			<aside>
				<h2 style={{ marginBottom: '1.25rem' }}>New Simulation</h2>
				<div
					className="card"
					style={{ padding: '1.5rem' }}
				>
					<form
						onSubmit={handleCreate}
						style={{
							display: 'flex',
							flexDirection: 'column',
							gap: '1.1rem',
						}}
					>
						{/* Title */}
						<div
							className="form-group"
							style={{ margin: 0 }}
						>
							<label className="form-label">
								Simulation Title
							</label>
							<input
								type="text"
								className="input-field"
								placeholder="e.g. Market Dynamics Q2"
								value={title}
								onChange={(e) => setTitle(e.target.value)}
							/>
						</div>

						{/* Drop zone */}
						<div
							className="form-group"
							style={{ margin: 0 }}
						>
							<label className="form-label">Seed Documents</label>
							<div
								onDrop={handleDrop}
								onDragOver={handleDragOver}
								onDragLeave={handleDragLeave}
								onClick={() => fileInputRef.current?.click()}
								style={{
									border: `2px dashed ${dragging ? 'var(--accent-color)' : 'var(--outline-variant)'}`,
									borderRadius: '10px',
									padding: '1.5rem 1rem',
									textAlign: 'center',
									cursor: 'pointer',
									background: dragging
										? 'var(--surface-container-low)'
										: 'transparent',
									transition: 'all 0.15s ease',
								}}
							>
								<UploadCloud
									size={28}
									color={
										dragging
											? 'var(--accent-color)'
											: 'var(--text-secondary)'
									}
									style={{ marginBottom: '0.5rem' }}
								/>
								{files.length > 0 ? (
									<p
										style={{
											fontSize: '0.82rem',
											color: 'var(--on-surface)',
											fontWeight: 500,
										}}
									>
										{files.length} file
										{files.length > 1 ? 's' : ''} selected
									</p>
								) : (
									<>
										<p
											style={{
												fontSize: '0.82rem',
												color: 'var(--text-secondary)',
												fontWeight: 500,
											}}
										>
											Drop files here or click to browse
										</p>
										<p
											style={{
												fontSize: '0.72rem',
												color: 'var(--outline)',
												marginTop: '0.2rem',
											}}
										>
											.md, .txt, .pdf and more
										</p>
									</>
								)}
								<input
									ref={fileInputRef}
									type="file"
									multiple
									style={{ display: 'none' }}
									onChange={(e) =>
										setFiles(Array.from(e.target.files))
									}
								/>
							</div>
						</div>

						{/* Rounds */}
						<div
							className="form-group"
							style={{ margin: 0 }}
						>
							<label className="form-label">
								Iterations / Rounds
							</label>
							<input
								type="number"
								min="1"
								max="100"
								className="input-field"
								value={rounds}
								onChange={(e) =>
									setRounds(Number(e.target.value))
								}
								required
							/>
						</div>

						{/* Agent Count Slider */}
						<div
							className="form-group"
							style={{ margin: 0 }}
						>
							<label className="form-label">
								Force Add Agents
							</label>
							<div style={{ paddingTop: '0.5rem' }}>
								<input
									type="range"
									min="0"
									max="4"
									step="1"
									value={agentSlider}
									onChange={(e) =>
										setAgentSlider(Number(e.target.value))
									}
									style={{
										width: '100%',
										cursor: 'pointer',
									}}
								/>
								<div
									style={{
										display: 'flex',
										justifyContent: 'space-between',
										marginTop: '0.4rem',
										fontSize: '0.7rem',
										color: 'var(--text-secondary)',
									}}
								>
									<span
										style={{
											fontWeight:
												agentSlider === 0 ? 600 : 400,
										}}
									>
										Natural
									</span>
									<span>50</span>
									<span>150</span>
									<span>300</span>
									<span>500</span>
								</div>
								<div
									style={{
										marginTop: '0.5rem',
										textAlign: 'center',
										fontSize: '0.82rem',
										fontWeight: 600,
										color: 'var(--accent-color)',
									}}
								>
									{agentSlider === 0
										? 'Generate naturally from input'
										: `Force inflate to ${getAgentCount(agentSlider)} agents`}
								</div>
							</div>
						</div>

						{/* Submit */}
						<button
							type="submit"
							className="btn"
							disabled={uploading}
							style={{
								width: '100%',
								justifyContent: 'center',
								letterSpacing: '0.06em',
								fontWeight: 700,
								gap: '0.5rem',
							}}
						>
							<Zap size={16} />
							{uploading ? 'Initializing…' : 'INITIALIZE ENGINE'}
						</button>
					</form>
				</div>

				<div
					style={{
						marginTop: '1.25rem',
						textAlign: 'center',
						fontSize: '0.72rem',
						color: 'var(--text-secondary)',
						lineHeight: 1.6,
					}}
				>
					<p style={{ margin: 0, fontWeight: 600 }}>
						Created by StaticaLabs Internal
					</p>
					<p>angelmacwan@staticalabs.com</p>
					<p style={{ margin: 0 }}>{appVersion || 'loading...'}</p>
				</div>
			</aside>
		</div>
	);
}
