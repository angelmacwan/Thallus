import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, Zap, X } from 'lucide-react';
import api from '../api';

export default function NewSimulationModal({ open, onClose }) {
	const [title, setTitle] = useState('');
	const [objective, setObjective] = useState('');
	const [files, setFiles] = useState([]);
	const [rounds, setRounds] = useState(3);
	const [agentSlider, setAgentSlider] = useState(0);
	const [uploading, setUploading] = useState(false);
	const [dragging, setDragging] = useState(false);
	const fileInputRef = useRef(null);
	const navigate = useNavigate();

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
	};

	const handleClose = () => {
		resetForm();
		onClose();
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
			if (agentCount > 0) formData.append('agent_count', agentCount);
			if (title.trim()) formData.append('title', title.trim());
			if (objective.trim())
				formData.append('objective', objective.trim());
			Array.from(files).forEach((file) => formData.append('files', file));

			const res = await api.post('/simulation/upload', formData, {
				headers: { 'Content-Type': 'multipart/form-data' },
			});
			handleClose();
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
