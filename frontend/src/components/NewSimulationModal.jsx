import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, Zap, X, Globe, Search } from 'lucide-react';
import api from '../api';
import { useNotifications } from '../hooks/useNotifications';

export default function NewSimulationModal({ open, onClose }) {
	const [title, setTitle] = useState('');
	const [objective, setObjective] = useState('');
	const [files, setFiles] = useState([]);
	const [rounds, setRounds] = useState(3);
	const [agentSlider, setAgentSlider] = useState(0);
	const [uploading, setUploading] = useState(false);
	const [dragging, setDragging] = useState(false);
	const [enableWebSearch, setEnableWebSearch] = useState(false);
	const [focusTopics, setFocusTopics] = useState([]);
	const [topicInput, setTopicInput] = useState('');
	const fileInputRef = useRef(null);
	const navigate = useNavigate();
	const { ensurePermission } = useNotifications();

	// Auto-enable web search when no seed documents are uploaded
	useEffect(() => {
		if (files.length === 0) setEnableWebSearch(true);
	}, [files]);

	const getAgentCount = (sliderValue) => {
		const counts = [0, 50, 150, 300, 500];
		return counts[sliderValue];
	};

	const resetForm = () => {
		setTitle('');
		setObjective('');
		setFiles([]);
		setRounds(3);
		setAgentSlider(0);
		setEnableWebSearch(false);
		setFocusTopics([]);
		setTopicInput('');
	};

	const handleClose = () => {
		resetForm();
		onClose();
	};

	const handleCreate = async (e) => {
		e.preventDefault();
		if (!objective.trim())
			return alert('Investigation Objective is required.');
		await ensurePermission();
		setUploading(true);

		try {
			const formData = new FormData();
			formData.append('rounds', rounds);
			const agentCount = getAgentCount(agentSlider);
			if (agentCount > 0) formData.append('agent_count', agentCount);
			if (title.trim()) formData.append('title', title.trim());
			formData.append('objective', objective.trim());
			Array.from(files).forEach((file) => formData.append('files', file));
			formData.append(
				'enable_web_search',
				enableWebSearch ? 'true' : 'false',
			);
			if (focusTopics.length > 0)
				formData.append('focus_topics', JSON.stringify(focusTopics));

			const res = await api.post('/simulation/upload', formData, {
				headers: { 'Content-Type': 'multipart/form-data' },
			});
			handleClose();
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

	const handleDragOver = (e) => {
		e.preventDefault();
		setDragging(true);
	};

	const handleDragLeave = () => setDragging(false);

	if (!open) return null;

	return (
		<div
			style={{
				position: 'fixed',
				inset: 0,
				background: 'rgba(0, 0, 0, 0.3)',
				backdropFilter: 'blur(4px)',
				WebkitBackdropFilter: 'blur(4px)',
				zIndex: 1000,
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				padding: '1rem',
			}}
			onClick={handleClose}
		>
			<div
				className="card"
				style={{
					width: '100%',
					maxWidth: '480px',
					maxHeight: '90vh',
					overflowY: 'auto',
					padding: '1.75rem',
					borderRadius: '16px',
				}}
				onClick={(e) => e.stopPropagation()}
			>
				{/* Header */}
				<div
					style={{
						display: 'flex',
						justifyContent: 'space-between',
						alignItems: 'center',
						marginBottom: '1.5rem',
					}}
				>
					<h2 style={{ margin: 0, fontSize: '1.2rem' }}>
						New Simulation
					</h2>
					<button
						onClick={handleClose}
						style={{
							background: 'none',
							border: 'none',
							cursor: 'pointer',
							color: 'var(--text-secondary)',
							padding: '0.25rem',
							display: 'flex',
							alignItems: 'center',
						}}
					>
						<X size={20} />
					</button>
				</div>

				{/* Form */}
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
						<label className="form-label">Simulation Title</label>
						<input
							type="text"
							className="input-field"
							placeholder="e.g. Market Dynamics Q2"
							value={title}
							onChange={(e) => setTitle(e.target.value)}
						/>
					</div>

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
							onChange={(e) => setObjective(e.target.value)}
							rows={2}
							style={{
								resize: 'vertical',
								fontFamily: 'inherit',
								lineHeight: 1.5,
							}}
						/>
						<p
							style={{
								fontSize: '0.72rem',
								color: 'var(--text-secondary)',
								margin: '0.3rem 0 0',
								lineHeight: 1.4,
							}}
						>
							The AI will generate targeted questions from this
							objective and answer them after the simulation.
						</p>
					</div>

					{/* Drop zone */}
					<div
						className="form-group"
						style={{ margin: 0 }}
					>
						<label className="form-label">
							Seed Documents{' '}
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
						<p
							style={{
								fontSize: '0.72rem',
								color: 'var(--text-secondary)',
								margin: '0.3rem 0 0',
								lineHeight: 1.4,
							}}
						>
							No documents? Web Search will automatically seed the
							simulation with relevant results.
						</p>
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
								Automatically searches Google for news,
								articles, and data relevant to your seed topics
								and adds them as context documents.
							</p>
						</div>
					</label>

					{/* Focus Topics */}
					{enableWebSearch && (
						<div
							style={{
								display: 'flex',
								flexDirection: 'column',
								gap: '0.5rem',
							}}
						>
							<label
								style={{
									fontSize: '0.82rem',
									fontWeight: 600,
									color: 'var(--on-surface)',
									display: 'flex',
									alignItems: 'center',
									gap: '0.35rem',
								}}
							>
								<Search size={13} />
								Focus Topics
								<span
									style={{
										fontSize: '0.68rem',
										fontWeight: 400,
										color: 'var(--text-secondary)',
									}}
								>
									— optional
								</span>
							</label>
							<p
								style={{
									fontSize: '0.72rem',
									color: 'var(--text-secondary)',
									margin: 0,
									lineHeight: 1.4,
								}}
							>
								Specific topics to search directly on the web.
								Press Enter or comma to add.
							</p>
							<div
								style={{
									display: 'flex',
									flexWrap: 'wrap',
									gap: '0.4rem',
									padding: '0.5rem',
									background:
										'var(--surface-variant, rgba(0,0,0,0.04))',
									borderRadius: '8px',
									border: '1.5px solid var(--outline-variant)',
									minHeight: '2.4rem',
									alignItems: 'center',
								}}
							>
								{focusTopics.map((topic) => (
									<span
										key={topic}
										style={{
											display: 'inline-flex',
											alignItems: 'center',
											gap: '0.3rem',
											background:
												'rgba(var(--accent-rgb, 37,99,235),0.12)',
											color: 'var(--accent-color)',
											borderRadius: '999px',
											padding:
												'0.2rem 0.55rem 0.2rem 0.65rem',
											fontSize: '0.75rem',
											fontWeight: 500,
										}}
									>
										{topic}
										<button
											type="button"
											onClick={() =>
												setFocusTopics((prev) =>
													prev.filter(
														(t) => t !== topic,
													),
												)
											}
											style={{
												background: 'none',
												border: 'none',
												cursor: 'pointer',
												padding: 0,
												lineHeight: 1,
												color: 'var(--accent-color)',
												display: 'flex',
												alignItems: 'center',
											}}
										>
											<X size={11} />
										</button>
									</span>
								))}
								<input
									type="text"
									value={topicInput}
									onChange={(e) => {
										const val = e.target.value;
										if (val.endsWith(',')) {
											const trimmed = val
												.slice(0, -1)
												.trim();
											if (
												trimmed &&
												!focusTopics.includes(trimmed)
											)
												setFocusTopics((prev) => [
													...prev,
													trimmed,
												]);
											setTopicInput('');
										} else {
											setTopicInput(val);
										}
									}}
									onKeyDown={(e) => {
										if (e.key === 'Enter') {
											e.preventDefault();
											const trimmed = topicInput.trim();
											if (
												trimmed &&
												!focusTopics.includes(trimmed)
											)
												setFocusTopics((prev) => [
													...prev,
													trimmed,
												]);
											setTopicInput('');
										}
									}}
									placeholder={
										focusTopics.length === 0
											? 'e.g. US Iran War, tech layoffs, AI regulation…'
											: 'Add another topic…'
									}
									style={{
										border: 'none',
										outline: 'none',
										background: 'transparent',
										fontSize: '0.8rem',
										color: 'var(--on-surface)',
										minWidth: '10rem',
										flex: 1,
									}}
								/>
							</div>
						</div>
					)}

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
							onChange={(e) => setRounds(Number(e.target.value))}
							required
						/>
					</div>

					{/* Agent Count Slider */}
					<div
						className="form-group"
						style={{ margin: 0 }}
					>
						<label className="form-label">Force Add Agents</label>
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
								style={{ width: '100%', cursor: 'pointer' }}
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
		</div>
	);
}
