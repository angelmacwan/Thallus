import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import api from '../../api';

export default function CreateWorldModal({ open, onClose, onSave }) {
	const [name, setName] = useState('');
	const [description, setDescription] = useState('');
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState('');

	useEffect(() => {
		if (!open) return;
		setName('');
		setDescription('');
		setError('');
	}, [open]);

	if (!open) return null;

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
	const lbl = {
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
					width: 440,
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
					<h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>
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

				{/* Name */}
				<div style={{ marginBottom: '0.9rem' }}>
					<label style={lbl}>World Name *</label>
					<input
						value={name}
						onChange={(e) => setName(e.target.value)}
						placeholder="e.g. Regional Sales Team"
						style={inp}
						onKeyDown={(e) => e.key === 'Enter' && submit()}
					/>
				</div>

				{/* Description */}
				<div style={{ marginBottom: '1rem' }}>
					<label style={lbl}>Description</label>
					<textarea
						value={description}
						onChange={(e) => setDescription(e.target.value)}
						rows={3}
						placeholder="Describe the social context, setting, or goals of this world…"
						style={{ ...inp, resize: 'vertical' }}
					/>
				</div>

				{/* Error */}
				{error && (
					<p style={{ fontSize: '0.8rem', color: '#dc2626', margin: '0 0 0.5rem' }}>
						{error}
					</p>
				)}

				{/* Footer */}
				<div
					style={{
						display: 'flex',
						gap: '0.5rem',
						justifyContent: 'flex-end',
						marginTop: '0.5rem',
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
							cursor: saving || !name.trim() ? 'not-allowed' : 'pointer',
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
