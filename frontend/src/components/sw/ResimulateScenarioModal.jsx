import React, { useState } from 'react';
import { X, RotateCcw, AlertTriangle } from 'lucide-react';
import { swWorlds } from '../../api';

function countDescendants(scenario) {
	if (!scenario?.children?.length) return 0;
	return scenario.children.reduce(
		(sum, child) => sum + 1 + countDescendants(child),
		0,
	);
}

export default function ResimulateScenarioModal({
	worldId,
	scenario,
	onClose,
	onSuccess,
}) {
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState(null);

	const childCount = countDescendants(scenario);

	const handleSubmit = async () => {
		setSubmitting(true);
		setError(null);
		try {
			await swWorlds.scenarios.resimulate(worldId, scenario.scenario_id);
			onSuccess();
		} catch (err) {
			setError(
				err?.response?.data?.detail || 'Failed to start resimulation.',
			);
			setSubmitting(false);
		}
	};

	return (
		<div
			style={{
				position: 'fixed',
				inset: 0,
				background: 'rgba(0,0,0,0.50)',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				zIndex: 1000,
				padding: '1rem',
			}}
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
		>
			<div
				style={{
					background: 'var(--surface)',
					borderRadius: '14px',
					padding: '2rem',
					width: '100%',
					maxWidth: '520px',
					display: 'flex',
					flexDirection: 'column',
					gap: '1.25rem',
					boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
					border: '1px solid var(--outline-variant)',
				}}
			>
				{/* Header */}
				<div
					style={{
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'space-between',
					}}
				>
					<div
						style={{
							display: 'flex',
							alignItems: 'center',
							gap: '0.6rem',
						}}
					>
						<RotateCcw
							size={20}
							color="var(--accent-color)"
						/>
						<h3
							style={{
								margin: 0,
								fontSize: '1rem',
								fontWeight: 700,
							}}
						>
							Resimulate Scenario
						</h3>
					</div>
					<button
						onClick={onClose}
						style={{
							background: 'none',
							border: 'none',
							cursor: 'pointer',
							color: 'var(--text-secondary)',
							display: 'flex',
							alignItems: 'center',
							padding: '0.25rem',
							borderRadius: '6px',
						}}
					>
						<X size={18} />
					</button>
				</div>

				{/* Data-loss warning */}
				<div
					style={{
						display: 'flex',
						gap: '0.65rem',
						background: '#fee2e2',
						border: '1px solid #fca5a5',
						borderRadius: '10px',
						padding: '0.85rem 1rem',
						fontSize: '0.82rem',
						color: '#991b1b',
						lineHeight: 1.5,
					}}
				>
					<AlertTriangle
						size={16}
						style={{ flexShrink: 0, marginTop: '0.1rem' }}
					/>
					<span>
						All events, reports, and simulation data for this
						scenario will be permanently deleted and the simulation
						will be re-run from scratch.
					</span>
				</div>

				{/* Child cascade warning */}
				{childCount > 0 && (
					<div
						style={{
							display: 'flex',
							gap: '0.65rem',
							background: '#fffbeb',
							border: '1px solid #fcd34d',
							borderRadius: '10px',
							padding: '0.85rem 1rem',
							fontSize: '0.82rem',
							color: '#92400e',
							lineHeight: 1.5,
						}}
					>
						<AlertTriangle
							size={16}
							style={{ flexShrink: 0, marginTop: '0.1rem' }}
						/>
						<span>
							This scenario has{' '}
							<strong>
								{childCount} child{' '}
								{childCount === 1 ? 'scenario' : 'scenarios'}
							</strong>
							. All child scenarios will also be resimulated in
							the order they were created. Their data will be
							cleared as well.
						</span>
					</div>
				)}

				{/* Scenario summary */}
				<div
					style={{
						background: 'var(--surface-container-high)',
						border: '1px solid var(--outline-variant)',
						borderRadius: '10px',
						padding: '0.85rem 1rem',
						display: 'flex',
						flexDirection: 'column',
						gap: '0.3rem',
					}}
				>
					<span
						style={{
							fontSize: '0.78rem',
							fontWeight: 700,
							color: 'var(--on-surface)',
						}}
					>
						{scenario?.name}
					</span>
					{scenario?.seed_text && (
						<span
							style={{
								fontSize: '0.78rem',
								color: 'var(--text-secondary)',
								fontStyle: 'italic',
							}}
						>
							{scenario.seed_text}
						</span>
					)}
				</div>

				{error && (
					<p
						style={{
							margin: 0,
							fontSize: '0.82rem',
							color: '#dc2626',
							background: '#fee2e2',
							padding: '0.6rem 0.85rem',
							borderRadius: '8px',
						}}
					>
						{error}
					</p>
				)}

				{/* Actions */}
				<div
					style={{
						display: 'flex',
						gap: '0.75rem',
						justifyContent: 'flex-end',
					}}
				>
					<button
						onClick={onClose}
						disabled={submitting}
						style={{
							padding: '0.55rem 1.1rem',
							borderRadius: '8px',
							border: '1px solid var(--outline-variant)',
							background: 'transparent',
							cursor: submitting ? 'not-allowed' : 'pointer',
							fontSize: '0.85rem',
							color: 'var(--text-secondary)',
						}}
					>
						Cancel
					</button>
					<button
						onClick={handleSubmit}
						disabled={submitting}
						style={{
							padding: '0.55rem 1.25rem',
							borderRadius: '8px',
							border: 'none',
							background: 'var(--accent-color)',
							color: '#fff',
							fontWeight: 700,
							cursor: submitting ? 'not-allowed' : 'pointer',
							fontSize: '0.85rem',
							display: 'flex',
							alignItems: 'center',
							gap: '0.4rem',
							opacity: submitting ? 0.65 : 1,
						}}
					>
						<RotateCcw
							size={14}
							style={
								submitting
									? { animation: 'spin 1s linear infinite' }
									: {}
							}
						/>
						{submitting ? 'Starting…' : 'Resimulate'}
					</button>
				</div>
			</div>
		</div>
	);
}
