import React, { useState } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import api from '../../api';
import SmallWorldReport from './SmallWorldReport';

function DeltaChip({ value }) {
	if (value === null || value === undefined)
		return <span style={{ color: 'var(--text-secondary)' }}>—</span>;
	const pct = Math.round(value * 100);
	const abs = Math.abs(pct);
	if (pct > 0)
		return (
			<span
				style={{
					color: '#16a34a',
					display: 'flex',
					alignItems: 'center',
					gap: 2,
				}}
			>
				<TrendingUp size={12} />+{abs}%
			</span>
		);
	if (pct < 0)
		return (
			<span
				style={{
					color: '#dc2626',
					display: 'flex',
					alignItems: 'center',
					gap: 2,
				}}
			>
				<TrendingDown size={12} />-{abs}%
			</span>
		);
	return (
		<span
			style={{
				color: 'var(--text-secondary)',
				display: 'flex',
				alignItems: 'center',
				gap: 2,
			}}
		>
			<Minus size={12} />
			0%
		</span>
	);
}

function flattenScenarios(list) {
	const result = [];
	for (const s of list || []) {
		result.push(s);
		if (s.children?.length) result.push(...flattenScenarios(s.children));
	}
	return result;
}

export default function ScenarioDiff({ worldId, scenarios }) {
	const [scenA, setScenA] = useState('');
	const [scenB, setScenB] = useState('');
	const [diff, setDiff] = useState(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');

	const completedScenarios = flattenScenarios(scenarios).filter(
		(s) => s.status === 'completed',
	);

	const compute = async () => {
		if (!scenA || !scenB || scenA === scenB) {
			setError('Select two different completed scenarios.');
			return;
		}
		setError('');
		setLoading(true);
		setDiff(null);
		try {
			const res = await api.post(
				`/small-world/worlds/${worldId}/scenarios/diff`,
				{ scenario_id_a: scenA, scenario_id_b: scenB },
			);
			setDiff(res.data);
		} catch (e) {
			setError(e?.response?.data?.detail || 'Comparison failed.');
		} finally {
			setLoading(false);
		}
	};

	const sel = {
		padding: '0.45rem 0.7rem',
		background: 'var(--surface-container-lowest)',
		border: '1px solid var(--outline-variant)',
		borderRadius: '7px',
		fontSize: '0.83rem',
		color: 'var(--text-primary)',
		outline: 'none',
		flex: 1,
	};
	const secTitle = {
		fontSize: '0.72rem',
		fontWeight: 700,
		textTransform: 'uppercase',
		letterSpacing: '0.06em',
		color: 'var(--text-secondary)',
		marginBottom: '0.5rem',
		marginTop: '1.1rem',
	};

	return (
		<div style={{ padding: '0.5rem 0' }}>
			{/* Picker */}
			<div
				style={{
					display: 'flex',
					gap: '0.5rem',
					alignItems: 'center',
					flexWrap: 'wrap',
				}}
			>
				<select
					value={scenA}
					onChange={(e) => setScenA(e.target.value)}
					style={sel}
				>
					<option value="">Scenario A…</option>
					{completedScenarios.map((s) => (
						<option
							key={s.scenario_id}
							value={s.scenario_id}
						>
							{'↳ '.repeat(s.depth)}
							{s.name}
						</option>
					))}
				</select>
				<span
					style={{
						color: 'var(--text-secondary)',
						fontSize: '0.85rem',
					}}
				>
					vs
				</span>
				<select
					value={scenB}
					onChange={(e) => setScenB(e.target.value)}
					style={sel}
				>
					<option value="">Scenario B…</option>
					{completedScenarios.map((s) => (
						<option
							key={s.scenario_id}
							value={s.scenario_id}
						>
							{'↳ '.repeat(s.depth)}
							{s.name}
						</option>
					))}
				</select>
				<button
					onClick={compute}
					disabled={loading || !scenA || !scenB}
					style={{
						padding: '0.47rem 1.1rem',
						background: 'var(--accent-color)',
						color: '#fff',
						border: 'none',
						borderRadius: '7px',
						fontSize: '0.83rem',
						fontWeight: 600,
						cursor: loading ? 'not-allowed' : 'pointer',
						whiteSpace: 'nowrap',
					}}
				>
					{loading ? 'Comparing…' : 'Compare'}
				</button>
			</div>
			{error && (
				<p
					style={{
						fontSize: '0.8rem',
						color: '#dc2626',
						margin: '0.4rem 0 0',
					}}
				>
					{error}
				</p>
			)}

			{diff && (
				<div style={{ marginTop: '1rem' }}>
					{/* Summary */}
					{diff.summary && (
						<div
							style={{
								background: 'var(--secondary-container)',
								borderRadius: '8px',
								padding: '0.6rem 0.9rem',
								fontSize: '0.85rem',
								color: 'var(--on-secondary-container)',
								marginBottom: '0.5rem',
							}}
						>
							{diff.summary}
						</div>
					)}

					{/* Divergence round */}
					{diff.divergence_round !== null &&
						diff.divergence_round !== undefined && (
							<p
								style={{
									fontSize: '0.8rem',
									color: 'var(--text-secondary)',
									margin: '0 0 0.75rem',
								}}
							>
								Scenarios diverged at round{' '}
								<strong>{diff.divergence_round}</strong>
							</p>
						)}

					{/* Metric deltas */}
					{diff.metric_deltas && (
						<>
							<p style={secTitle}>Metric Deltas (B − A)</p>
							<div
								style={{
									display: 'flex',
									gap: '0.5rem',
									flexWrap: 'wrap',
								}}
							>
								{Object.entries(diff.metric_deltas).map(
									([k, v]) => (
										<div
											key={k}
											style={{
												flex: '1 1 100px',
												padding: '0.65rem 0.75rem',
												background:
													'var(--surface-container-high)',
												borderRadius: '9px',
												textAlign: 'center',
											}}
										>
											<div
												style={{
													fontSize: '0.68rem',
													fontWeight: 600,
													textTransform: 'uppercase',
													letterSpacing: '0.05em',
													color: 'var(--text-secondary)',
													marginBottom: '0.3rem',
												}}
											>
												{k.replace(/_/g, ' ')}
											</div>
											<div
												style={{
													display: 'flex',
													justifyContent: 'center',
													fontSize: '1rem',
													fontWeight: 700,
												}}
											>
												<DeltaChip value={v} />
											</div>
										</div>
									),
								)}
							</div>
						</>
					)}

					{/* Agent behavior changes */}
					{diff.agent_behavior_changes?.length > 0 && (
						<>
							<p style={secTitle}>Agent Activity</p>
							<table
								style={{
									width: '100%',
									borderCollapse: 'collapse',
									fontSize: '0.82rem',
								}}
							>
								<thead>
									<tr
										style={{
											background:
												'var(--surface-container-high)',
										}}
									>
										{[
											'Agent',
											'Actions (A)',
											'Actions (B)',
											'Δ',
										].map((h) => (
											<th
												key={h}
												style={{
													textAlign: 'left',
													padding: '0.3rem 0.6rem',
													fontWeight: 600,
													fontSize: '0.7rem',
													color: 'var(--text-secondary)',
												}}
											>
												{h}
											</th>
										))}
									</tr>
								</thead>
								<tbody>
									{diff.agent_behavior_changes.map((r, i) => (
										<tr
											key={i}
											style={{
												borderBottom:
													'1px solid var(--outline-variant)',
											}}
										>
											<td
												style={{
													padding: '0.3rem 0.6rem',
													fontWeight: 600,
												}}
											>
												{r.agent_name}
											</td>
											<td
												style={{
													padding: '0.3rem 0.6rem',
												}}
											>
												{r.actions_a ?? '—'}
											</td>
											<td
												style={{
													padding: '0.3rem 0.6rem',
												}}
											>
												{r.actions_b ?? '—'}
											</td>
											<td
												style={{
													padding: '0.3rem 0.6rem',
												}}
											>
												<DeltaChip value={r.delta} />
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</>
					)}

					{/* Side-by-side reports */}
					{(diff.report_a || diff.report_b) && (
						<>
							<p style={secTitle}>Reports</p>
							<div
								style={{
									display: 'grid',
									gridTemplateColumns: '1fr 1fr',
									gap: '0.75rem',
								}}
							>
								{[
									{
										label: 'Scenario A',
										report: diff.report_a,
									},
									{
										label: 'Scenario B',
										report: diff.report_b,
									},
								].map(({ label, report }) => (
									<div
										key={label}
										style={{
											border: '1px solid var(--outline-variant)',
											borderRadius: '10px',
											padding: '0.9rem',
										}}
									>
										<p
											style={{
												margin: '0 0 0.6rem',
												fontWeight: 700,
												fontSize: '0.82rem',
											}}
										>
											{label}
										</p>
										<SmallWorldReport report={report} />
									</div>
								))}
							</div>
						</>
					)}
				</div>
			)}
		</div>
	);
}
