import React, { useState } from 'react';
import { X, Play } from 'lucide-react';
import api from '../../api';

export default function RunScenarioModal({
	open,
	onClose,
	worldId,
	parentScenario,
	onCreated,
}) {
	const [name, setName] = useState('');
	const [seedText, setSeedText] = useState('');
	const [rounds, setRounds] = useState(3);
	const [error, setError] = useState('');
	const [saving, setSaving] = useState(false);

	if (!open) return null;

	const reset = () => {
		setName('');
		setSeedText('');
		setRounds(3);
		setError('');
	};

	const close = () => {
		reset();
		onClose();
	};

	const submit = async () => {
		if (!name.trim()) {
			setError('Scenario name is required.');
			return;
		}
		if (!seedText.trim()) {
			setError('Seed text is required — it defines the initial event.');
			return;
		}
		setError('');
		setSaving(true);
		try {
			// 1. Create scenario
			const payload = {
				name: name.trim(),
				seed_text: seedText.trim(),
				parent_scenario_id: parentScenario?.scenario_id || null,
				rounds,
			};
			const createRes = await api.post(
				`/small-world/worlds/${worldId}/scenarios/`,
				payload,
			);
			const scenario = createRes.data;

			// 2. Start run (fire and forget — SSE will stream progress)
			api.post(
				`/small-world/worlds/${worldId}/scenarios/${scenario.scenario_id}/run`,
			).catch(() => {});

			onCreated(scenario);
			close();
		} catch (e) {
			setError(e?.response?.data?.detail || 'Failed to create scenario.');
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
			onClick={close}
		>
			<div
				className="card"
				style={{ width: 440, padding: '1.5rem', borderRadius: '14px' }}
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
					<div>
						<h2
							style={{
								margin: 0,
								fontSize: '1.05rem',
								fontWeight: 700,
							}}
						>
							New Scenario
						</h2>
						{parentScenario && (
							<p
								style={{
									margin: '2px 0 0',
									fontSize: '0.76rem',
									color: 'var(--text-secondary)',
								}}
							>
								Branching from:{' '}
								<strong>{parentScenario.name}</strong>
							</p>
						)}
					</div>
					<button
						onClick={close}
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
					<label style={lbl}>Scenario Name *</label>
					<input
						value={name}
						onChange={(e) => setName(e.target.value)}
						placeholder="e.g. Q3 Price Hike Announcement"
						style={inp}
					/>
				</div>

				{/* Seed */}
				<div style={{ marginBottom: '0.9rem' }}>
					<label style={lbl}>Seed Event *</label>
					<textarea
						value={seedText}
						onChange={(e) => setSeedText(e.target.value)}
						rows={4}
						placeholder="Describe the initial event or change that triggers this simulation…"
						style={{ ...inp, resize: 'vertical' }}
					/>
				</div>

				{/* Rounds */}
				<div style={{ marginBottom: '1rem' }}>
					<label style={lbl}>Simulation Rounds: {rounds}</label>
					<input
						type="range"
						min={1}
						max={10}
						value={rounds}
						onChange={(e) => setRounds(Number(e.target.value))}
						style={{
							width: '100%',
							accentColor: 'var(--accent-color)',
						}}
					/>
					<div
						style={{
							display: 'flex',
							justifyContent: 'space-between',
							fontSize: '0.7rem',
							color: 'var(--text-secondary)',
							marginTop: 2,
						}}
					>
						<span>1 (quick)</span>
						<span>10 (deep)</span>
					</div>
				</div>

				{error && (
					<p
						style={{
							fontSize: '0.8rem',
							color: '#dc2626',
							margin: '0 0 0.5rem',
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
					}}
				>
					<button
						onClick={close}
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
						disabled={saving}
						style={{
							display: 'flex',
							alignItems: 'center',
							gap: '0.4rem',
							padding: '0.55rem 1.2rem',
							background: 'var(--accent-color)',
							color: '#fff',
							border: 'none',
							borderRadius: '8px',
							fontSize: '0.85rem',
							fontWeight: 600,
							cursor: saving ? 'not-allowed' : 'pointer',
						}}
					>
						<Play size={13} />{' '}
						{saving ? 'Starting…' : 'Run Scenario'}
					</button>
				</div>
			</div>
		</div>
	);
}
