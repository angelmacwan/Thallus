import React, { useState, useEffect } from 'react';
import {
	BarChart,
	Bar,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip as RechartsTooltip,
	ResponsiveContainer,
	LineChart,
	Line,
	Legend,
} from 'recharts';
import api from '../api';
import {
	Activity,
	Network,
	TrendingUp,
	RefreshCw,
	BarChart2,
	AlertCircle,
	CheckCircle,
	Info,
	FileText,
	ArrowUp,
	ArrowDown,
	Minus,
} from 'lucide-react';

export default function MetricsDashboard({ sessionId, isScenario }) {
	const [loading, setLoading] = useState(true);
	const [generating, setGenerating] = useState(false);
	const [status, setStatus] = useState(null);

	const [networkData, setNetworkData] = useState(null);
	const [spreadData, setSpreadData] = useState(null);
	const [engagementData, setEngagementData] = useState(null);
	const [narrativeData, setNarrativeData] = useState(null);
	const [summaryData, setSummaryData] = useState(null);
	const [error, setError] = useState(null);

	const basePath = isScenario
		? `/metrics/scenario/${sessionId}`
		: `/metrics/${sessionId}`;

	const checkStatus = async () => {
		setLoading(true);
		setError(null);
		try {
			const res = await api.get(`${basePath}/status`);
			setStatus(res.data);
			if (res.data.available) {
				fetchAllMetrics();
			} else {
				setLoading(false);
			}
		} catch (err) {
			if (err.response?.status === 404) {
				setStatus({ available: false });
			} else {
				setError('Failed to load metrics status.');
			}
			setLoading(false);
		}
	};

	const fetchAllMetrics = async () => {
		try {
			const [
				networkRes,
				spreadRes,
				engagementRes,
				narrativeRes,
				summaryRes,
			] = await Promise.all([
				api.get(`${basePath}/network`),
				api.get(`${basePath}/spread`),
				api
					.get(`${basePath}/engagement`)
					.catch(() => ({ data: { engagement: {} } })),
				api
					.get(`${basePath}/narratives`)
					.catch(() => ({
						data: { top_transitions: [], total_chains: 0 },
					})),
				api
					.get(`${basePath}/summary`)
					.catch(() => ({ data: { insights: [], key_metrics: {} } })),
			]);
			setNetworkData(networkRes.data);
			setSpreadData(spreadRes.data);
			setEngagementData(engagementRes.data);
			setNarrativeData(narrativeRes.data);
			setSummaryData(summaryRes.data);
		} catch (err) {
			setError('Failed to fetch metrics data.');
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		if (sessionId) {
			checkStatus();
		}
	}, [sessionId]);

	const handleGenerate = async () => {
		setGenerating(true);
		setError(null);
		try {
			await api.post(`${basePath}/generate`);
			// Poll for status
			const interval = setInterval(async () => {
				try {
					const res = await api.get(`${basePath}/status`);
					if (res.data.available) {
						clearInterval(interval);
						setStatus(res.data);
						await fetchAllMetrics();
						setGenerating(false);
					}
				} catch {
					// Ignore transient errors
				}
			}, 2000);

			// Timeout after 60s
			setTimeout(() => {
				clearInterval(interval);
				if (generating) {
					setGenerating(false);
					setError('Metrics generation timed out.');
				}
			}, 60000);
		} catch (err) {
			setError('Failed to start metrics generation.');
			setGenerating(false);
		}
	};

	if (loading) {
		return (
			<div
				style={{
					display: 'flex',
					justifyContent: 'center',
					padding: '3rem',
					color: 'var(--text-secondary)',
				}}
			>
				<RefreshCw
					size={24}
					className="animate-spin"
				/>
				<span style={{ marginLeft: '0.5rem' }}>Loading metrics...</span>
			</div>
		);
	}

	if (!status?.available) {
		return (
			<div style={{ padding: '3rem 1rem', textAlign: 'center' }}>
				<div
					style={{
						display: 'inline-flex',
						padding: '1rem',
						background: 'var(--surface-container-low)',
						borderRadius: '50%',
						marginBottom: '1rem',
					}}
				>
					<BarChart2
						size={32}
						color="var(--accent-color)"
					/>
				</div>
				<h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>
					No Metrics Available
				</h3>
				<p
					style={{
						color: 'var(--text-secondary)',
						marginBottom: '1.5rem',
						fontSize: '0.9rem',
					}}
				>
					Run a metrics generation task to compute behavioral,
					network, and information spread metrics.
				</p>
				<button
					onClick={handleGenerate}
					disabled={generating}
					style={{
						padding: '0.6rem 1.2rem',
						background: 'var(--accent-color)',
						color: 'white',
						border: 'none',
						borderRadius: '6px',
						cursor: generating ? 'not-allowed' : 'pointer',
						fontWeight: 600,
						display: 'inline-flex',
						alignItems: 'center',
						gap: '0.5rem',
						opacity: generating ? 0.7 : 1,
					}}
				>
					{generating ? (
						<RefreshCw
							size={16}
							className="animate-spin"
						/>
					) : (
						<BarChart2 size={16} />
					)}
					{generating ? 'Generating...' : 'Generate Metrics'}
				</button>
				{error && (
					<div
						style={{
							color: 'var(--error-color)',
							marginTop: '1rem',
							fontSize: '0.85rem',
						}}
					>
						{error}
					</div>
				)}
			</div>
		);
	}



	const renderOverviewTab = () => {
		if (!summaryData) return null;

		const eci = networkData?.echo_chamber_index ?? 0;
		const homophily = networkData?.homophily_score ?? 0;
		let eciColor = '#10b981'; // green
		let eciLabel = 'Open Discourse';
		if (eci >= 0.7) {
			eciColor = '#ef4444';
			eciLabel = 'Strong Echo Chambers';
		} else if (eci >= 0.4) {
			eciColor = '#f59e0b';
			eciLabel = 'Moderate Clustering';
		}

		let densityOverTimeData = [];
		if (networkData?.density_by_round) {
			densityOverTimeData = Object.entries(networkData.density_by_round)
				.map(([round, density]) => ({
					round: parseInt(round),
					density,
				}))
				.sort((a, b) => a.round - b.round);
		}

		const getSeverityIcon = (severity) => {
			switch (severity) {
				case 'warning':
					return (
						<AlertCircle
							size={18}
							color="#f59e0b"
						/>
					);
				case 'critical':
					return (
						<AlertCircle
							size={18}
							color="#ef4444"
						/>
					);
				default:
					return (
						<Info
							size={18}
							color="#2563eb"
						/>
					);
			}
		};

		const getSeverityBg = (severity) => {
			switch (severity) {
				case 'warning':
					return 'rgba(245, 158, 11, 0.1)';
				case 'critical':
					return 'rgba(239, 68, 68, 0.1)';
				default:
					return 'rgba(37, 99, 235, 0.1)';
			}
		};

		return (
			<div
				style={{
					display: 'flex',
					flexDirection: 'column',
					gap: '1.5rem',
				}}
			>
				{/* Key Metrics Cards */}
				<div
					style={{
						display: 'grid',
						gridTemplateColumns:
							'repeat(auto-fit, minmax(200px, 1fr))',
						gap: '1rem',
					}}
				>
					{summaryData.key_metrics?.network_density !== undefined && (
						<div
							style={{
								background: 'var(--surface-container-low)',
								padding: '1.5rem',
								borderRadius: '12px',
								textAlign: 'center',
							}}
						>
							<div
								style={{
									fontSize: '0.85rem',
									color: 'var(--text-secondary)',
									marginBottom: '0.5rem',
									textTransform: 'uppercase',
									letterSpacing: '0.05em',
								}}
							>
								Network Density
							</div>
							<div
								style={{ fontSize: '1.8rem', fontWeight: 700 }}
							>
								{summaryData.key_metrics.network_density.toFixed(
									3,
								)}
							</div>
						</div>
					)}
					{summaryData.key_metrics?.echo_chamber_level !==
						undefined && (
							<>
								<div
									style={{
										background: 'var(--surface-container-low)',
										padding: '1.5rem',
										borderRadius: '12px',
										textAlign: 'center',
										borderBottom: `4px solid ${eciColor}`,
									}}
								>
									<div
										style={{
											fontSize: '0.85rem',
											color: 'var(--text-secondary)',
											marginBottom: '0.5rem',
											textTransform: 'uppercase',
											letterSpacing: '0.05em',
										}}
									>
										Echo Chamber Index
									</div>
									<div
										style={{
											fontSize: '1.8rem',
											fontWeight: 700,
											color: eciColor,
										}}
									>
										{eci.toFixed(2)}
									</div>
									<div
										style={{
											fontSize: '0.75rem',
											marginTop: '0.5rem',
											color: eciColor,
											fontWeight: 600,
										}}
									>
										{eciLabel}
									</div>
								</div>
								<div
									style={{
										background: 'var(--surface-container-low)',
										padding: '1.5rem',
										borderRadius: '12px',
										textAlign: 'center',
									}}
								>
									<div
										style={{
											fontSize: '0.85rem',
											color: 'var(--text-secondary)',
											marginBottom: '0.5rem',
											textTransform: 'uppercase',
											letterSpacing: '0.05em',
										}}
									>
										Homophily Score
									</div>
									<div style={{ fontSize: '1.8rem', fontWeight: 700 }}>
										{homophily.toFixed(2)}
									</div>
									<div
										style={{
											fontSize: '0.75rem',
											marginTop: '0.5rem',
											color: 'var(--text-secondary)',
										}}
									>
										Same-belief clustering
									</div>
								</div>
							</>
						)}
					{summaryData.key_metrics?.narrative_chains !==
						undefined && (
							<div
								style={{
									background: 'var(--surface-container-low)',
									padding: '1.5rem',
									borderRadius: '12px',
									textAlign: 'center',
								}}
							>
								<div
									style={{
										fontSize: '0.85rem',
										color: 'var(--text-secondary)',
										marginBottom: '0.5rem',
										textTransform: 'uppercase',
										letterSpacing: '0.05em',
									}}
								>
									Narrative Chains
								</div>
								<div
									style={{ fontSize: '1.8rem', fontWeight: 700 }}
								>
									{summaryData.key_metrics.narrative_chains}
								</div>
							</div>
						)}
					{status?.num_rounds && (
						<div
							style={{
								background: 'var(--surface-container-low)',
								padding: '1.5rem',
								borderRadius: '12px',
								textAlign: 'center',
							}}
						>
							<div
								style={{
									fontSize: '0.85rem',
									color: 'var(--text-secondary)',
									marginBottom: '0.5rem',
									textTransform: 'uppercase',
									letterSpacing: '0.05em',
								}}
							>
								Simulation Rounds
							</div>
							<div
								style={{ fontSize: '1.8rem', fontWeight: 700 }}
							>
								{status.num_rounds}
							</div>
						</div>
					)}
				</div>

				{densityOverTimeData.length > 1 && (
					<div
						style={{
							background: 'var(--surface-container-low)',
							padding: '1.5rem',
							borderRadius: '12px',
						}}
					>
						<h4 style={{ marginBottom: '1rem', fontSize: '1rem' }}>
							Network Density Evolution
						</h4>
						<p
							style={{
								fontSize: '0.85rem',
								color: 'var(--text-secondary)',
								marginBottom: '1rem',
							}}
						>
							How network connectivity changed across simulation
							rounds
						</p>
						<div style={{ height: 300 }}>
							<ResponsiveContainer
								width="100%"
								height="100%"
							>
								<LineChart
									data={densityOverTimeData}
									margin={{
										top: 5,
										right: 30,
										left: 20,
										bottom: 5,
									}}
								>
									<CartesianGrid
										strokeDasharray="3 3"
										vertical={false}
									/>
									<XAxis
										dataKey="round"
										label={{
											value: 'Round',
											position: 'insideBottom',
											offset: -10,
										}}
									/>
									<YAxis domain={[0, 'auto']} />
									<RechartsTooltip
										contentStyle={{
											background:
												'var(--surface-container)',
											border: 'none',
											borderRadius: '8px',
										}}
									/>
									<Line
										type="monotone"
										dataKey="density"
										stroke="#2563eb"
										strokeWidth={3}
										dot={{ r: 4, fill: '#2563eb' }}
										activeDot={{ r: 6 }}
									/>
								</LineChart>
							</ResponsiveContainer>
						</div>
					</div>
				)}

				{/* Actionable Insights */}
				{summaryData.insights && summaryData.insights.length > 0 && (
					<div
						style={{
							background: 'var(--surface-container-low)',
							padding: '1.5rem',
							borderRadius: '12px',
						}}
					>
						<h4
							style={{
								marginBottom: '1rem',
								fontSize: '1.1rem',
								fontWeight: 600,
							}}
						>
							Actionable Insights
						</h4>
						<div
							style={{
								display: 'flex',
								flexDirection: 'column',
								gap: '0.75rem',
							}}
						>
							{summaryData.insights.map((insight, i) => (
								<div
									key={i}
									style={{
										display: 'flex',
										gap: '1rem',
										padding: '1rem',
										background: getSeverityBg(
											insight.severity,
										),
										borderRadius: '8px',
										border: '1px solid var(--outline-variant)',
									}}
								>
									<div style={{ paddingTop: '0.1rem' }}>
										{getSeverityIcon(insight.severity)}
									</div>
									<div style={{ flex: 1 }}>
										<div
											style={{
												fontWeight: 600,
												marginBottom: '0.25rem',
												fontSize: '0.95rem',
											}}
										>
											{insight.title}
										</div>
										<div
											style={{
												fontSize: '0.85rem',
												color: 'var(--text-secondary)',
											}}
										>
											{insight.description}
										</div>
									</div>
								</div>
							))}
						</div>
					</div>
				)}
			</div>
		);
	};

	const renderContentTab = () => {
		if (!spreadData) return null;

		let adoptionChartData = [];
		if (spreadData.adoption_curves) {
			const roundsMap = {};
			Object.entries(spreadData.adoption_curves).forEach(
				([concept, curve]) => {
					curve.forEach((pt) => {
						if (!roundsMap[pt.round])
							roundsMap[pt.round] = { round: pt.round };
						roundsMap[pt.round][concept] = pt.adoption;
					});
				},
			);
			adoptionChartData = Object.values(roundsMap).sort(
				(a, b) => a.round - b.round,
			);
		}

		const colors = [
			'#2563eb',
			'#7c3aed',
			'#db2777',
			'#059669',
			'#d97706',
			'#8b5cf6',
			'#10b981',
			'#f59e0b',
		];

		return (
			<div
				style={{
					display: 'flex',
					flexDirection: 'column',
					gap: '1.5rem',
				}}
			>
				{adoptionChartData.length > 0 && (
					<div
						style={{
							background: 'var(--surface-container-low)',
							padding: '1.5rem',
							borderRadius: '12px',
						}}
					>
						<h4 style={{ marginBottom: '1rem', fontSize: '1rem' }}>
							Concept Adoption Over Time
						</h4>
						<p
							style={{
								fontSize: '0.85rem',
								color: 'var(--text-secondary)',
								marginBottom: '1rem',
							}}
						>
							Percentage of agents mentioning each concept per
							round
						</p>
						<div style={{ height: 350 }}>
							<ResponsiveContainer
								width="100%"
								height="100%"
							>
								<LineChart
									data={adoptionChartData}
									margin={{
										top: 5,
										right: 30,
										left: 20,
										bottom: 5,
									}}
								>
									<CartesianGrid
										strokeDasharray="3 3"
										vertical={false}
									/>
									<XAxis
										dataKey="round"
										label={{
											value: 'Round',
											position: 'insideBottom',
											offset: -10,
										}}
									/>
									<YAxis
										tickFormatter={(val) =>
											`${(val * 100).toFixed(0)}%`
										}
										padding={{ top: 20 }}
										domain={[0, 'auto']}
									/>
									<RechartsTooltip
										formatter={(val) =>
											`${(val * 100).toFixed(1)}%`
										}
										contentStyle={{
											background:
												'var(--surface-container)',
											border: 'none',
											borderRadius: '8px',
										}}
									/>
									<Legend
										wrapperStyle={{ paddingTop: '20px' }}
									/>
									{Object.keys(
										spreadData.adoption_curves || {},
									)
										.slice(0, 8)
										.map((concept, i) => (
											<Line
												key={concept}
												type="monotone"
												dataKey={concept}
												stroke={
													colors[i % colors.length]
												}
												strokeWidth={3}
												dot={{
													r: 4,
													fill: colors[
														i % colors.length
													],
												}}
												activeDot={{ r: 6 }}
											/>
										))}
								</LineChart>
							</ResponsiveContainer>
						</div>
					</div>
				)}

				{spreadData.co_occurrence &&
					spreadData.co_occurrence.length > 0 && (
						<div
							style={{
								background: 'var(--surface-container-low)',
								padding: '1.5rem',
								borderRadius: '12px',
							}}
						>
							<h4
								style={{
									marginBottom: '1rem',
									fontSize: '1rem',
								}}
							>
								Concept Co-occurrence
							</h4>
							<p
								style={{
									fontSize: '0.85rem',
									color: 'var(--text-secondary)',
									marginBottom: '1rem',
								}}
							>
								Jaccard similarity of agents mentioning concept
								pairs
							</p>
							<div
								style={{
									display: 'flex',
									flexWrap: 'wrap',
									gap: '0.75rem',
								}}
							>
								{spreadData.co_occurrence
									.slice(0, 20)
									.map((item, i) => (
										<div
											key={i}
											style={{
												display: 'flex',
												alignItems: 'center',
												background:
													'var(--surface-container)',
												padding: '0.5rem 0.75rem',
												borderRadius: '8px',
												border: '1px solid var(--outline-variant)',
											}}
										>
											<span
												style={{
													fontWeight: 500,
													fontSize: '0.85rem',
												}}
											>
												{item.pair[0]}
											</span>
											<span
												style={{
													margin: '0 0.5rem',
													color: 'var(--text-secondary)',
												}}
											>
												&
											</span>
											<span
												style={{
													fontWeight: 500,
													fontSize: '0.85rem',
												}}
											>
												{item.pair[1]}
											</span>
											<span
												style={{
													background:
														'rgba(37, 99, 235, 0.1)',
													color: 'var(--accent-color)',
													padding: '0.2rem 0.5rem',
													borderRadius: '4px',
													fontSize: '0.75rem',
													marginLeft: '0.75rem',
													fontWeight: 600,
												}}
											>
												{item.jaccard.toFixed(2)}
											</span>
										</div>
									))}
							</div>
						</div>
					)}

				{narrativeData &&
					narrativeData.top_transitions &&
					narrativeData.top_transitions.length > 0 && (
						<div
							style={{
								background: 'var(--surface-container-low)',
								padding: '1.5rem',
								borderRadius: '12px',
							}}
						>
							<h4
								style={{
									marginBottom: '1rem',
									fontSize: '1rem',
								}}
							>
								Top Narrative Transitions
							</h4>
							<p
								style={{
									fontSize: '0.85rem',
									color: 'var(--text-secondary)',
									marginBottom: '1rem',
								}}
							>
								How concepts transition in agent communications
								(from → to)
							</p>
							<div
								style={{
									display: 'grid',
									gridTemplateColumns:
										'repeat(auto-fill, minmax(250px, 1fr))',
									gap: '0.75rem',
								}}
							>
								{narrativeData.top_transitions.map(
									(trans, i) => (
										<div
											key={i}
											style={{
												display: 'flex',
												alignItems: 'center',
												justifyContent: 'space-between',
												background:
													'var(--surface-container)',
												padding: '0.75rem',
												borderRadius: '8px',
												border: '1px solid var(--outline-variant)',
											}}
										>
											<div
												style={{
													display: 'flex',
													alignItems: 'center',
													gap: '0.5rem',
													flex: 1,
													minWidth: 0,
												}}
											>
												<span
													style={{
														fontWeight: 600,
														fontSize: '0.85rem',
														color: 'var(--accent-color)',
														whiteSpace: 'nowrap',
														overflow: 'hidden',
														textOverflow:
															'ellipsis',
													}}
												>
													{trans.from}
												</span>
												<span
													style={{
														color: 'var(--text-secondary)',
													}}
												>
													→
												</span>
												<span
													style={{
														fontWeight: 600,
														fontSize: '0.85rem',
														color: '#7c3aed',
														whiteSpace: 'nowrap',
														overflow: 'hidden',
														textOverflow:
															'ellipsis',
													}}
												>
													{trans.to}
												</span>
											</div>
											<span
												style={{
													background:
														'rgba(124, 58, 237, 0.1)',
													color: '#7c3aed',
													padding: '0.2rem 0.5rem',
													borderRadius: '4px',
													fontSize: '0.75rem',
													fontWeight: 600,
													marginLeft: '0.5rem',
												}}
											>
												×{trans.count}
											</span>
										</div>
									),
								)}
							</div>
						</div>
					)}
			</div>
		);
	};

	return (
		<div
			style={{
				display: 'flex',
				flexDirection: 'column',
				height: '100%',
				padding: '1.5rem',
				overflowY: 'auto',
			}}
		>
			<div
				style={{
					display: 'flex',
					justifyContent: 'space-between',
					alignItems: 'center',
					marginBottom: '1.5rem',
				}}
			>
				<div>
					<h2
						style={{
							fontSize: '1.5rem',
							fontWeight: 700,
							margin: 0,
						}}
					>
						Metrics Dashboard
					</h2>
					<p
						style={{
							color: 'var(--text-secondary)',
							fontSize: '0.85rem',
							marginTop: '0.25rem',
						}}
					>
						Generated{' '}
						{status?.generated_at
							? new Date(status.generated_at).toLocaleString()
							: 'recently'}
						{status?.num_rounds && ` • ${status.num_rounds} rounds`}
					</p>
				</div>
				<button
					onClick={handleGenerate}
					disabled={generating}
					style={{
						padding: '0.5rem 1rem',
						background: 'transparent',
						color: 'var(--accent-color)',
						border: '1px solid var(--accent-color)',
						borderRadius: '6px',
						cursor: generating ? 'not-allowed' : 'pointer',
						fontWeight: 600,
						display: 'flex',
						alignItems: 'center',
						gap: '0.5rem',
						fontSize: '0.85rem',
						opacity: generating ? 0.7 : 1,
					}}
				>
					<RefreshCw
						size={14}
						className={generating ? 'animate-spin' : ''}
					/>
					Regenerate
				</button>
			</div>

			{error && (
				<div
					style={{
						background: 'var(--error-color)',
						color: 'white',
						padding: '0.75rem 1rem',
						borderRadius: '8px',
						marginBottom: '1.5rem',
						fontSize: '0.85rem',
					}}
				>
					{error}
				</div>
			)}

			<div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: '3rem', paddingBottom: '2rem' }}>
				<div>
					<h3 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
						<Info size={20} /> Overview
					</h3>
					{renderOverviewTab()}
				</div>
				{spreadData && (
					<div>
						{renderContentTab()}
					</div>
				)}
			</div>
		</div>
	);
}
