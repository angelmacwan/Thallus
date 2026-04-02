import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import {
	FileText,
	UploadCloud,
	Zap,
	Target,
	BookOpen,
	Briefcase,
	GraduationCap,
	Globe,
} from 'lucide-react';

export default function Home() {
	const [title, setTitle] = useState('');
	const [objective, setObjective] = useState('');
	const [files, setFiles] = useState([]);
	const [rounds, setRounds] = useState(3);
	const [agentSlider, setAgentSlider] = useState(0);
	const [uploading, setUploading] = useState(false);
	const [dragging, setDragging] = useState(false);
	const [enableWebSearch, setEnableWebSearch] = useState(false);
	const [appVersion, setAppVersion] = useState(null);
	const fileInputRef = useRef(null);
	const navigate = useNavigate();

	useEffect(() => {
		api.get('/version')
			.then((res) => setAppVersion(res.data.version))
			.catch(() => {});
	}, []);

	const getAgentCount = (v) => [0, 50, 150, 300, 500][v];

	const handleCreate = async (e) => {
		e.preventDefault();
		if (!files.length)
			return alert('Please drop or select files to upload');
		setUploading(true);
		try {
			const formData = new FormData();
			formData.append('rounds', rounds);
			const agentCount = getAgentCount(agentSlider);
			if (agentCount > 0) formData.append('agent_count', agentCount);
			if (title.trim()) formData.append('title', title.trim());
			if (objective.trim())
				formData.append('objective', objective.trim());
			Array.from(files).forEach((file) => formData.append('files', file));
			formData.append(
				'enable_web_search',
				enableWebSearch ? 'true' : 'false',
			);
			const res = await api.post('/simulation/upload', formData, {
				headers: { 'Content-Type': 'multipart/form-data' },
			});
			navigate(`/session/${res.data.session_id}`);
		} catch (err) {
			console.error('Upload failed', err);
			if (err.response?.status === 402) {
				alert(
					err.response.data?.detail ||
						'You have run out of credits. Please top up to continue.',
				);
			} else {
				alert('Upload failed. See console.');
			}
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

	return (
		<div
			className="fade-in"
			style={{ height: '100%' }}
		>
			<section
				style={{
					maxWidth: '860px',
					margin: '0 auto',
					textAlign: 'center',
					padding: '2rem 0',
				}}
			>
				<h1
					style={{
						fontSize: '4rem',
						fontWeight: 600,
						letterSpacing: '-0.02em',
						margin: 0,
						background:
							'linear-gradient(90deg, #ec4899 0%, #8b5cf6 30%, #000000 100%)',
						WebkitBackgroundClip: 'text',
						WebkitTextFillColor: 'transparent',
						backgroundClip: 'text',
						display: 'inline-block',
					}}
				>
					Thallus
				</h1>
			</section>

			<section style={{ maxWidth: '860px', margin: '0 auto' }}>
				{/* ── Inline simulation form ────────────────────────── */}
				<div
					className="card"
					style={{
						padding: '1.75rem',
						marginBottom: '2.5rem',
						maxWidth: '820px',
						margin: '0 auto 2.5rem',
					}}
				>
					<form
						onSubmit={handleCreate}
						style={{
							display: 'flex',
							flexDirection: 'column',
							gap: '1.1rem',
						}}
					>
						{/* Title – full width */}
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

						{/* 2-column grid */}
						<div
							style={{
								display: 'grid',
								gridTemplateColumns: '1fr 1fr',
								gap: '1.1rem',
								alignItems: 'start',
							}}
						>
							{/* Col 1 – Objective + Seed Documents */}
							<div
								style={{
									display: 'flex',
									flexDirection: 'column',
									gap: '1.1rem',
								}}
							>
								{/* Objective */}
								<div
									className="form-group"
									style={{ margin: 0 }}
								>
									<label className="form-label">
										Investigation Objective{' '}
										<span
											style={{
												fontWeight: 400,
												color: 'var(--text-secondary)',
												fontSize: '0.78rem',
											}}
										>
											(optional)
										</span>
									</label>
									<textarea
										className="input-field"
										placeholder="e.g. Understand how employees react to a 20% salary cut"
										value={objective}
										onChange={(e) =>
											setObjective(e.target.value)
										}
										rows={3}
										style={{
											resize: 'vertical',
											fontFamily: 'inherit',
											lineHeight: 1.5,
										}}
									/>
								</div>

								{/* Seed Documents */}
								<div
									className="form-group"
									style={{ margin: 0 }}
								>
									<label className="form-label">
										Seed Documents
									</label>
									<div
										onDrop={handleDrop}
										onDragOver={(e) => {
											e.preventDefault();
											setDragging(true);
										}}
										onDragLeave={() => setDragging(false)}
										onClick={() =>
											fileInputRef.current?.click()
										}
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
												{files.length > 1
													? 's'
													: ''}{' '}
												selected
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
													Drop files here or click to
													browse
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
												setFiles(
													Array.from(e.target.files),
												)
											}
										/>
									</div>
								</div>
							</div>

							{/* Col 2 – Web Search + Rounds + Agent Slider */}
							<div
								style={{
									display: 'flex',
									flexDirection: 'column',
									gap: '1.1rem',
								}}
							>
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
								{/* Web Search Grounding */}
								<label
									style={{
										display: 'flex',
										alignItems: 'flex-start',
										gap: '0.7rem',
										cursor: 'pointer',
										padding: '0.75rem 0.85rem',
										borderRadius: '10px',
										border: `1.5px solid ${enableWebSearch ? 'var(--accent-color)' : 'var(--outline-variant)'}`,
										background: enableWebSearch
											? 'rgba(var(--accent-rgb, 37,99,235),0.06)'
											: 'transparent',
										transition: 'all 0.15s ease',
									}}
								>
									<input
										type="checkbox"
										checked={enableWebSearch}
										onChange={(e) =>
											setEnableWebSearch(e.target.checked)
										}
										style={{
											marginTop: '0.15rem',
											accentColor: 'var(--accent-color)',
											flexShrink: 0,
										}}
									/>
									<div>
										<div
											style={{
												display: 'flex',
												alignItems: 'center',
												gap: '0.4rem',
												fontWeight: 600,
												fontSize: '0.85rem',
												color: enableWebSearch
													? 'var(--accent-color)'
													: 'var(--on-surface)',
											}}
										>
											<Globe size={14} />
											Enable Web Search Grounding
										</div>
										<p
											style={{
												fontSize: '0.72rem',
												color: 'var(--text-secondary)',
												margin: '0.25rem 0 0',
												lineHeight: 1.4,
											}}
										>
											Automatically searches Google for
											news, articles, and data relevant to
											your seed topics and adds them as
											context documents.
										</p>
									</div>
								</label>

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
												setAgentSlider(
													Number(e.target.value),
												)
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
														agentSlider === 0
															? 600
															: 400,
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
							</div>
						</div>

						{/* Submit – full width */}
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
			</section>
			{appVersion && (
				<div
					style={{
						textAlign: 'center',
						padding: '1rem 0 0.5rem',
						fontSize: '0.72rem',
						color: 'var(--outline)',
						letterSpacing: '0.04em',
					}}
				>
					{appVersion}
				</div>
			)}
		</div>
	);
}
