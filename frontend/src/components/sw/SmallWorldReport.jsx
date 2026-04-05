import React from 'react';
import { TrendingUp, TrendingDown, Minus, BarChart2, User } from 'lucide-react';

function stringifyReportValue(value) {
	if (value === null || value === undefined || value === '') return '';
	if (typeof value === 'string' || typeof value === 'number') {
		return String(value);
	}
	if (Array.isArray(value)) {
		return value
			.map((item) => stringifyReportValue(item))
			.filter(Boolean)
			.join(', ');
	}
	if (typeof value === 'object') {
		const flattened = Object.values(value)
			.map((item) => stringifyReportValue(item))
			.filter(Boolean);
		return flattened.join(', ');
	}
	return '';
}

function formatReportItem(item, primaryKeys = [], secondaryKeys = []) {
	if (typeof item === 'string' || typeof item === 'number') {
		return String(item);
	}
	if (!item || typeof item !== 'object') {
		return '—';
	}

	const primary = primaryKeys
		.map((key) => stringifyReportValue(item[key]))
		.find(Boolean);
	const secondary = secondaryKeys
		.map((key) => stringifyReportValue(item[key]))
		.find(Boolean);

	if (primary && secondary) return `${primary} — ${secondary}`;
	if (primary) return primary;
	if (secondary) return secondary;

	const fallback = stringifyReportValue(item);
	return fallback || JSON.stringify(item);
}

function ConfidenceBadge({ score }) {
	if (score === null || score === undefined) return null;
	const pct = Math.round(score * 100);
	const color = pct >= 70 ? '#16a34a' : pct >= 40 ? '#f59e0b' : '#dc2626';
	return (
		<span
			style={{
				padding: '0.22rem 0.7rem',
				borderRadius: '99px',
				background: `${color}22`,
				color,
				fontSize: '0.78rem',
				fontWeight: 700,
			}}
		>
			{pct}% confidence
		</span>
	);
}

export default function SmallWorldReport({ report }) {
	if (!report)
		return (
			<p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
				No report generated yet.
			</p>
		);

	const counterfactualText = formatReportItem(
		report.counterfactual,
		['condition'],
		['impact_description'],
	);

	const s = {
		sectionTitle: {
			fontSize: '0.78rem',
			fontWeight: 700,
			textTransform: 'uppercase',
			letterSpacing: '0.07em',
			color: 'var(--text-secondary)',
			marginBottom: '0.55rem',
			marginTop: '1.2rem',
		},
	};

	return (
		<div
			style={{
				fontSize: '0.88rem',
				color: 'var(--text-primary)',
				lineHeight: 1.6,
			}}
		>
			{/* Outcome header */}
			<div
				style={{
					display: 'flex',
					alignItems: 'flex-start',
					justifyContent: 'space-between',
					gap: '0.75rem',
					flexWrap: 'wrap',
					marginBottom: '0.8rem',
				}}
			>
				<p style={{ margin: 0, fontWeight: 600, flex: '1 1 260px' }}>
					{report.outcome_summary}
				</p>
				<ConfidenceBadge score={report.confidence_score} />
			</div>

			{/* Key drivers */}
			{report.key_drivers?.length > 0 && (
				<>
					<p style={s.sectionTitle}>Key Drivers</p>
					<ol style={{ margin: 0, paddingLeft: '1.4rem' }}>
						{report.key_drivers.map((d, i) => (
							<li
								key={i}
								style={{ marginBottom: '0.25rem' }}
							>
								{formatReportItem(
									d,
									['factor'],
									['explanation'],
								)}
							</li>
						))}
					</ol>
				</>
			)}

			{/* Agent behaviors */}
			{report.agent_behaviors?.length > 0 && (
				<>
					<p style={s.sectionTitle}>Agent Behavior</p>
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
									background: 'var(--surface-container-high)',
								}}
							>
								{[
									'Agent',
									'Behavior',
									'Sentiment',
									'Influence',
								].map((h) => (
									<th
										key={h}
										style={{
											textAlign: 'left',
											padding: '0.35rem 0.6rem',
											fontWeight: 600,
											color: 'var(--text-secondary)',
											fontSize: '0.72rem',
										}}
									>
										{h}
									</th>
								))}
							</tr>
						</thead>
						<tbody>
							{report.agent_behaviors.map((ab, i) => (
								<tr
									key={i}
									style={{
										borderBottom:
											'1px solid var(--outline-variant)',
									}}
								>
									<td
										style={{
											padding: '0.35rem 0.6rem',
											fontWeight: 600,
										}}
									>
										{ab.agent_name}
									</td>
									<td style={{ padding: '0.35rem 0.6rem' }}>
										{ab.primary_behavior ||
											ab.behavior_summary ||
											'—'}
									</td>
									<td style={{ padding: '0.35rem 0.6rem' }}>
										{ab.sentiment_shift ||
											ab.role_in_outcome ||
											'—'}
									</td>
									<td style={{ padding: '0.35rem 0.6rem' }}>
										{ab.influence_score !== undefined
											? `${Math.round(ab.influence_score * 100)}%`
											: '—'}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</>
			)}

			{/* Bottlenecks */}
			{report.bottlenecks_risks?.length > 0 && (
				<>
					<p style={s.sectionTitle}>Bottlenecks & Risks</p>
					<ul style={{ margin: 0, paddingLeft: '1.4rem' }}>
						{report.bottlenecks_risks.map((b, i) => (
							<li
								key={i}
								style={{ marginBottom: '0.2rem' }}
							>
								{formatReportItem(
									b,
									['risk', 'title', 'condition'],
									['impact_description', 'description'],
								)}
							</li>
						))}
					</ul>
				</>
			)}

			{/* Unexpected outcomes */}
			{report.unexpected_outcomes?.length > 0 && (
				<>
					<p style={s.sectionTitle}>Unexpected Outcomes</p>
					<ul style={{ margin: 0, paddingLeft: '1.4rem' }}>
						{report.unexpected_outcomes.map((u, i) => (
							<li
								key={i}
								style={{ marginBottom: '0.2rem' }}
							>
								{formatReportItem(
									u,
									['outcome', 'condition', 'title'],
									['impact_description', 'description'],
								)}
							</li>
						))}
					</ul>
				</>
			)}

			{/* Counterfactual */}
			{counterfactualText && (
				<>
					<p style={s.sectionTitle}>Counterfactual</p>
					<div
						style={{
							background: 'var(--surface-container-high)',
							borderLeft: '3px solid var(--accent-color)',
							padding: '0.7rem 0.9rem',
							borderRadius: '0 8px 8px 0',
							fontStyle: 'italic',
						}}
					>
						{counterfactualText}
					</div>
				</>
			)}

			{/* Recommendations */}
			{report.recommendations?.length > 0 && (
				<>
					<p style={s.sectionTitle}>Recommendations</p>
					{report.recommendations.map((r, i) => (
						<div
							key={i}
							style={{
								display: 'flex',
								gap: '0.6rem',
								marginBottom: '0.45rem',
								padding: '0.55rem 0.75rem',
								background: 'var(--secondary-container)',
								borderRadius: '8px',
							}}
						>
							<span
								style={{
									fontWeight: 700,
									color: 'var(--accent-color)',
									minWidth: 18,
								}}
							>
								#{i + 1}
							</span>
							<span
								style={{
									color: 'var(--on-secondary-container)',
								}}
							>
								{formatReportItem(
									r,
									['action'],
									['expected_impact'],
								)}
							</span>
						</div>
					))}
				</>
			)}
		</div>
	);
}
