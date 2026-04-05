import React, { useState } from 'react';
import { X, Wand2, Loader } from 'lucide-react';
import api from '../../api';

export default function AIAgentGeneratorModal({
	open,
	onClose,
	onGenerated,
	worldId,
}) {
	const [form, setForm] = useState({
		name: '',
		profession: '',
		organization: '',
		location: '',
		age: '',
		description: '',
	});
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');

	const setField = (k, v) => setForm((prev) => ({ ...prev, [k]: v }));

	const handleGenerate = async (e) => {
		e.preventDefault();
		if (!form.name.trim()) return setError('Name is required');
		if (!form.description.trim())
			return setError('Description is required');
		setLoading(true);
		setError('');
		try {
			const res = await api.post(
				`/small-world/worlds/${worldId}/agents/generate`,
				{
					name: form.name.trim(),
					profession: form.profession || null,
					organization: form.organization || null,
					location: form.location || null,
					age: form.age ? Number(form.age) : null,
					description: form.description.trim(),
				},
			);
			onGenerated(res.data);
			onClose();
		} catch (err) {
			setError(
				err.response?.data?.detail || 'Generation failed. Try again.',
			);
		} finally {
			setLoading(false);
		}
	};

	if (!open) return null;

	const inputStyle = {
		width: '100%',
		padding: '0.5rem 0.75rem',
		background: 'var(--surface-container-lowest)',
		border: '1px solid var(--outline-variant)',
		borderRadius: '7px',
		fontSize: '0.83rem',
		color: 'var(--text-primary)',
		outline: 'none',
		fontFamily: 'inherit',
	};

	return (
		<div
			style={{
				position: 'fixed',
				inset: 0,
				background: 'rgba(0,0,0,0.35)',
				backdropFilter: 'blur(4px)',
				zIndex: 2100,
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				padding: '1rem',
			}}
			onClick={onClose}
		>
			<div
				className="card"
				style={{
					width: '100%',
					maxWidth: '480px',
					padding: '1.5rem',
					borderRadius: '16px',
				}}
				onClick={(e) => e.stopPropagation()}
			>
				{/* Header */}
				<div
					style={{
						display: 'flex',
						justifyContent: 'space-between',
						alignItems: 'flex-start',
						marginBottom: '1.25rem',
					}}
				>
					<div>
						<div
							style={{
								display: 'flex',
								alignItems: 'center',
								gap: '0.5rem',
								marginBottom: '0.2rem',
							}}
						>
							<Wand2
								size={16}
								color="var(--accent-color)"
							/>
							<h2
								style={{
									margin: 0,
									fontSize: '1.05rem',
									fontWeight: 700,
								}}
							>
								AI Agent Generator
							</h2>
						</div>
						<p
							style={{
								margin: 0,
								fontSize: '0.8rem',
								color: 'var(--text-secondary)',
							}}
						>
							Fill in a few fields and describe the agent — AI
							fills the rest.
						</p>
					</div>
					<button
						onClick={onClose}
						style={{
							background: 'none',
							border: 'none',
							cursor: 'pointer',
							color: 'var(--text-secondary)',
							padding: '0.25rem',
							display: 'flex',
						}}
					>
						<X size={20} />
					</button>
				</div>

				<form onSubmit={handleGenerate}>
					<div
						style={{
							display: 'grid',
							gridTemplateColumns: '1fr 1fr',
							gap: '0.6rem 0.75rem',
							marginBottom: '0.75rem',
						}}
					>
						{[
							{
								key: 'name',
								label: 'Name *',
								placeholder: 'Jane Smith',
								span: 2,
							},
							{
								key: 'profession',
								label: 'Profession',
								placeholder: 'Product Management',
							},
							{
								key: 'organization',
								label: 'Organization',
								placeholder: 'Acme Corp',
							},
							{
								key: 'location',
								label: 'Location',
								placeholder: 'New York, USA',
							},
							{
								key: 'age',
								label: 'Age',
								placeholder: '34',
								type: 'number',
							},
						].map(({ key, label, placeholder, span, type }) => (
							<div
								key={key}
								style={{
									gridColumn: span === 2 ? '1 / -1' : 'auto',
								}}
							>
								<label
									style={{
										display: 'block',
										fontSize: '0.72rem',
										fontWeight: 600,
										textTransform: 'uppercase',
										letterSpacing: '0.05em',
										color: 'var(--text-secondary)',
										marginBottom: '0.25rem',
									}}
								>
									{label}
								</label>
								<input
									type={type || 'text'}
									value={form[key]}
									onChange={(e) =>
										setField(key, e.target.value)
									}
									placeholder={placeholder}
									style={inputStyle}
								/>
							</div>
						))}
					</div>

					<div style={{ marginBottom: '1rem' }}>
						<label
							style={{
								display: 'block',
								fontSize: '0.72rem',
								fontWeight: 600,
								textTransform: 'uppercase',
								letterSpacing: '0.05em',
								color: 'var(--text-secondary)',
								marginBottom: '0.25rem',
							}}
						>
							Description *
						</label>
						<textarea
							value={form.description}
							onChange={(e) =>
								setField('description', e.target.value)
							}
							rows={4}
							placeholder="Describe this agent in natural language. E.g.: 'A risk-averse mid-level manager who resists change and is motivated by job security. She tends to defer to authority and struggles with ambiguity.'"
							style={{ ...inputStyle, resize: 'vertical' }}
						/>
					</div>

					{error && (
						<p
							style={{
								color: '#dc2626',
								fontSize: '0.8rem',
								marginBottom: '0.75rem',
							}}
						>
							{error}
						</p>
					)}

					<div
						style={{
							display: 'flex',
							justifyContent: 'flex-end',
							gap: '0.5rem',
						}}
					>
						<button
							type="button"
							onClick={onClose}
							style={{
								padding: '0.6rem 1.2rem',
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
							type="submit"
							disabled={loading}
							style={{
								padding: '0.6rem 1.4rem',
								background: 'var(--accent-color)',
								color: '#fff',
								border: 'none',
								borderRadius: '8px',
								fontSize: '0.85rem',
								fontWeight: 600,
								cursor: loading ? 'wait' : 'pointer',
								opacity: loading ? 0.7 : 1,
								display: 'flex',
								alignItems: 'center',
								gap: '0.4rem',
							}}
						>
							{loading ? (
								<>
									<Loader
										size={14}
										className="spin"
									/>{' '}
									Generating…
								</>
							) : (
								<>
									<Wand2 size={14} /> Generate Profile
								</>
							)}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
