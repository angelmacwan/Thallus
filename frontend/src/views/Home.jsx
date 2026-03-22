import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { PlayCircle, PlusCircle, FileText } from 'lucide-react';

export default function Home() {
	const [sessions, setSessions] = useState([]);
	const [loading, setLoading] = useState(true);
	const [showNew, setShowNew] = useState(false);
	const [files, setFiles] = useState([]);
	const [rounds, setRounds] = useState(3);
	const [uploading, setUploading] = useState(false);
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

	const handleCreate = async (e) => {
		e.preventDefault();
		if (!files.length) return alert('Please select files to upload');
		setUploading(true);

		try {
			const formData = new FormData();
			formData.append('rounds', rounds);
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

	return (
		<div className="fade-in">
			<div
				style={{
					display: 'flex',
					justifyContent: 'space-between',
					alignItems: 'center',
					marginBottom: '2rem',
				}}
			>
				<h1>Your Simulations</h1>
				<button
					className="btn"
					onClick={() => setShowNew(!showNew)}
				>
					<PlusCircle size={20} />
					New Session
				</button>
			</div>

			{showNew && (
				<div
					className="card fade-in"
					style={{
						marginBottom: '2rem',
						border: '1px solid var(--accent-color)',
					}}
				>
					<h3>Create New Simulation</h3>
					<form
						onSubmit={handleCreate}
						style={{ marginTop: '1rem' }}
					>
						<div className="form-group">
							<label className="form-label">
								Seed Documents (Inputs)
							</label>
							<input
								type="file"
								multiple
								className="input-field"
								onChange={(e) => setFiles(e.target.files)}
								style={{ background: 'transparent' }}
								required
							/>
						</div>
						<div className="form-group">
							<label className="form-label">
								Simulation Rounds
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
						<button
							type="submit"
							className="btn"
							disabled={uploading}
						>
							{uploading ? 'Uploading...' : 'Simulate'}
						</button>
					</form>
				</div>
			)}

			{loading ? (
				<p>Loading sessions...</p>
			) : sessions.length === 0 ? (
				<div
					className="card"
					style={{ textAlign: 'center', padding: '3rem' }}
				>
					<FileText
						size={48}
						color="var(--text-secondary)"
						style={{ marginBottom: '1rem' }}
					/>
					<h3 style={{ color: 'var(--text-secondary)' }}>
						No simulations found
					</h3>
					<p>Create a new session to get started.</p>
				</div>
			) : (
				<div
					style={{
						display: 'grid',
						gridTemplateColumns:
							'repeat(auto-fill, minmax(300px, 1fr))',
						gap: '1.5rem',
					}}
				>
					{sessions.map((s) => (
						<div
							className="card"
							key={s.id}
							style={{
								display: 'flex',
								flexDirection: 'column',
								cursor: 'pointer',
							}}
							onClick={() => navigate(`/session/${s.session_id}`)}
						>
							<h4>Simulation #{s.id}</h4>
							<div
								style={{
									fontSize: '0.9rem',
									color: 'var(--text-secondary)',
									marginBottom: '1rem',
								}}
							>
								<p>
									Status:{' '}
									<span
										style={{
											color:
												s.status === 'completed'
													? 'var(--success-color)'
													: s.status === 'error'
														? 'var(--danger-color)'
														: 'var(--accent-color)',
										}}
									>
										{s.status}
									</span>
								</p>
								<p>
									Created:{' '}
									{new Date(s.created_at).toLocaleString()}
								</p>
							</div>
							<div
								style={{
									marginTop: 'auto',
									display: 'flex',
									justifyContent: 'flex-end',
								}}
							>
								<PlayCircle
									size={24}
									color="var(--accent-color)"
								/>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
