import React, { useState, useEffect } from 'react';
import { X, Search } from 'lucide-react';
import api from '../../api';

export default function CreateWorldModal({ open, onClose, onSave }) {
	const [name, setName] = useState('');
	const [description, setDescription] = useState('');
	const [agents, setAgents] = useState([]);
	const [selected, setSelected] = useState([]);
	const [search, setSearch] = useState('');
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState('');

	useEffect(() => {
		if (!open) return;
		setName('');
		setDescription('');
		setSelected([]);
		setSearch('');
		setError('');
		setLoading(true);
		api.get('/small-world/agents/')
			.then((r) => setAgents(r.data))
			.catch(() => {})
			.finally(() => setLoading(false));
	}, [open]);

	if (!open) return null;

	const filtered = agents.filter(
		(a) =>
			a.name.toLowerCase().includes(search.toLowerCase()) ||
			(a.profession || '').toLowerCase().includes(search.toLowerCase()),
	);

	const toggle = (id) =>
		setSelected((s) =>
			s.includes(id) ? s.filter((x) => x !== id) : [...s, id],
		);

	const submit = async () => {
		if (!name.trim()) {
			setError('World name is required.');
			return;
		}
		setError('');
		setSaving(true);
		try {
			const res = await api.post('/small-world/worlds/', {
				name: name.trim(),
				description: description.trim(),
				agent_ids: selected,
			});
			onSave(res.data);
			onClose();
		} catch (e) {
			setError(e?.response?.data?.detail || 'Failed to create world.');
		} finally {
			setSaving(false);
		}
	};

	const inp = {
		width: '100%',
		padding: '0.5rem 0.75rem',
		background: 'var(--surface-container-lowest)',
		border: '1px solid var(--outline-variant)',
		borderRadius: '8px',
		fontSize: '0.85rem',
		color: 'var(--text-primary)',
		outline: 'none',
		boxSizing: 'border-box',
	};
	const label = {
		display: 'block',
		fontSize: '0.72rem',
		fontWeight: 600,
		textTransform: 'uppercase',
		letterSpacing: '0.05em',
		color: 'var(--text-secondary)',
		marginBottom: '0.3rem',
	};

	return (
		<div
			style={{
				position: 'fixed',
				inset: 0,
				background: 'rgba(0,0,0,0.45)',
				zIndex: 100,
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
			}}
			onClick={onClose}
		>
			<div
				className="card"
				style={{
					width: 460,
					maxHeight: '85vh',
					display: 'flex',
					flexDirection: 'column',
					padding: '1.5rem',
					borderRadius: '14px',
				}}
				onClick={(e) => e.stopPropagation()}
			>
				{/* Header */}
				<div
					style={{
						display: 'flex',
						justifyContent: 'space-between',
						alignItems: 'center',
						marginBottom: '1.2rem',
					}}
				>
					<h2
						style={{
							margin: 0,
							fontSize: '1.05rem',
							fontWeight: 700,
						}}
					>
						Create World
					</h2>
					<button
						onClick={onClose}
						style={{
							background: 'none',
							border: 'none',
							cursor: 'pointer',
							color: 'var(--text-secondary)',
						}}
					>
						<X size={18} />
					</button>
				</div>

				<div style={{ overflowY: 'auto', flex: 1, paddingRight: 4 }}>
					{/* Name */}
					<div style={{ marginBottom: '0.9rem' }}>
						<label style={label}>World Name *</label>
						<input
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="e.g. Regional Sales Team"
							style={inp}
						/>
					</div>

					{/* Description */}
					<div style={{ marginBottom: '1rem' }}>
						<label style={label}>Description</label>
						<textarea
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							rows={3}
							placeholder="Describe the social context, setting, or goals of this world…"
							style={{ ...inp, resize: 'vertical' }}
						/>
					</div>

					{/* Agent picker */}
					<div>
						<div
							style={{
								display: 'flex',
								justifyContent: 'space-between',
								alignItems: 'center',
								marginBottom: '0.3rem',
							}}
						>
							<label style={{ ...label, marginBottom: 0 }}>
								Agents ({selected.length} selected)
							</label>
							<button
								type="button"
								onClick={() =>
									selected.length === filtered.length
										? setSelected([])
										: setSelected(
												filtered.map((a) => a.agent_id),
											)
								}
								style={{
									background: 'none',
									border: 'none',
									cursor: 'pointer',
									fontSize: '0.75rem',
									fontWeight: 600,
									color: 'var(--accent-color)',
									padding: 0,
								}}
							>
								{selected.length === filtered.length &&
								filtered.length > 0
									? 'Deselect All'
									: 'Select All'}
							</button>
						</div>
						<div
							style={{
								position: 'relative',
								marginBottom: '0.4rem',
							}}
						>
							<Search
								size={14}
								style={{
									position: 'absolute',
									left: 10,
									top: '50%',
									transform: 'translateY(-50%)',
									color: 'var(--text-secondary)',
								}}
							/>
							<input
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								placeholder="Search agents…"
								style={{ ...inp, paddingLeft: '2rem' }}
							/>
						</div>
						<div
							style={{
								border: '1px solid var(--outline-variant)',
								borderRadius: '8px',
								maxHeight: '200px',
								overflowY: 'auto',
								background: 'var(--surface-container-lowest)',
							}}
						>
							{loading ? (
								<p
									style={{
										padding: '0.8rem',
										fontSize: '0.82rem',
										color: 'var(--text-secondary)',
										margin: 0,
									}}
								>
									Loading agents…
								</p>
							) : filtered.length === 0 ? (
								<p
									style={{
										padding: '0.8rem',
										fontSize: '0.82rem',
										color: 'var(--text-secondary)',
										margin: 0,
									}}
								>
									No agents found.
								</p>
							) : (
								filtered.map((a) => {
									const sel = selected.includes(a.agent_id);
									return (
										<div
											key={a.agent_id}
											onClick={() => toggle(a.agent_id)}
											style={{
												display: 'flex',
												alignItems: 'center',
												gap: '0.65rem',
												padding: '0.55rem 0.75rem',
												cursor: 'pointer',
												background: sel
													? 'var(--secondary-container)'
													: 'transparent',
												transition: 'background 0.15s',
												borderBottom:
													'1px solid var(--outline-variant)',
											}}
										>
											<input
												type="checkbox"
												readOnly
												checked={sel}
												style={{
													accentColor:
														'var(--accent-color)',
													cursor: 'pointer',
												}}
											/>
											<div>
												<div
													style={{
														fontSize: '0.83rem',
														fontWeight: sel
															? 700
															: 400,
														color: sel
															? 'var(--on-secondary-container)'
															: 'var(--text-primary)',
													}}
												>
													{a.name}
												</div>
												<div
													style={{
														fontSize: '0.72rem',
														color: 'var(--text-secondary)',
													}}
												>
													{a.job_title ||
														a.profession ||
														'—'}
												</div>
											</div>
										</div>
									);
								})
							)}
						</div>
					</div>
				</div>

				{/* Footer */}
				{error && (
					<p
						style={{
							fontSize: '0.8rem',
							color: '#dc2626',
							margin: '0.5rem 0 0',
						}}
					>
						{error}
					</p>
				)}
				<div
					style={{
						display: 'flex',
						gap: '0.5rem',
						justifyContent: 'flex-end',
						marginTop: '1rem',
					}}
				>
					<button
						onClick={onClose}
						style={{
							padding: '0.55rem 1.1rem',
							background: 'var(--surface-container-high)',
							border: '1px solid var(--outline-variant)',
							borderRadius: '8px',
							fontSize: '0.85rem',
							cursor: 'pointer',
						}}
					>
						Cancel
					</button>
					<button
						onClick={submit}
						disabled={saving || !name.trim()}
						style={{
							padding: '0.55rem 1.3rem',
							background: 'var(--accent-color)',
							color: '#fff',
							border: 'none',
							borderRadius: '8px',
							fontSize: '0.85rem',
							fontWeight: 600,
							cursor:
								saving || !name.trim()
									? 'not-allowed'
									: 'pointer',
							opacity: !name.trim() ? 0.6 : 1,
						}}
					>
						{saving ? 'Creating…' : 'Create World'}
					</button>
				</div>
			</div>
		</div>
	);
}
