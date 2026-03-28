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
import ConceptCooccurrenceGraph from './ConceptCooccurrenceGraph';
import NarrativeTransitionsGraph from './NarrativeTransitionsGraph';

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
	const [activeConcept, setActiveConcept] = useState(null);

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
			// Use unified endpoint that returns all metrics at once
			const response = await api.get(basePath);
			const data = response.data;

			if (!data.available) {
				setStatus({ available: false });
				return;
			}

			// Populate all state from unified response
			setNetworkData(data.network || {});
			setSpreadData(data.spread || {});
			setEngagementData(data.engagement || { engagement: {} });
			setNarrativeData(
				data.narratives || { top_transitions: [], total_chains: 0 },
			);
			setSummaryData(data.summary || { insights: [], key_metrics: {} });
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

		// Clear all existing metrics data to avoid showing stale data
		setNetworkData(null);
		setSpreadData(null);
		setEngagementData(null);
		setNarrativeData(null);
		setSummaryData(null);

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
				case 'success':
					return (
						<CheckCircle
							size={18}
							color="#10b981"
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
				case 'success':
					return 'rgba(16, 185, 129, 0.1)';
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
								<div
									style={{
										fontSize: '1.8rem',
										fontWeight: 700,
									}}
								>
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
				</div>

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
							Insights
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
												marginBottom: '0.5rem',
											}}
										>
											{insight.description}
										</div>
										{insight.key_finding && (
											<div
												style={{
													fontSize: '0.8rem',
													color: 'var(--accent-color)',
													fontWeight: 500,
													fontStyle: 'italic',
													padding: '0.5rem',
													background:
														'rgba(37, 99, 235, 0.05)',
													borderRadius: '4px',
													borderLeft:
														'3px solid var(--accent-color)',
												}}
											>
												💡 {insight.key_finding}
											</div>
										)}
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
							round. Click a concept in the legend to filter.
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
										wrapperStyle={{
											paddingTop: '20px',
											cursor: 'pointer',
										}}
										onClick={(e) => {
											if (e && e.dataKey) {
												setActiveConcept((prev) =>
													prev === e.dataKey
														? null
														: e.dataKey,
												);
											}
										}}
									/>
									{Object.keys(
										spreadData.adoption_curves || {},
									)
										.slice(0, 8)
										.map((concept, i) => {
											const isHidden =
												activeConcept &&
												activeConcept !== concept;
											return (
												<Line
													key={concept}
													type="monotone"
													dataKey={concept}
													stroke={
														colors[
															i % colors.length
														]
													}
													strokeWidth={
														isHidden ? 1 : 3
													}
													strokeOpacity={
														isHidden ? 0.2 : 1
													}
													dot={
														isHidden
															? false
															: {
																	r: 4,
																	fill: colors[
																		i %
																			colors.length
																	],
																}
													}
													activeDot={
														isHidden
															? false
															: { r: 6 }
													}
												/>
											);
										})}
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
									marginBottom: '0.5rem',
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
								Jaccard similarity measures how often agent
								communities mention concept pairs together. High
								values (0.8-1.0) indicate concepts are tightly
								coupled in narratives. Low values (0.2-0.4)
								suggest concepts appeal to different audiences.
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
									.map((item, i) => {
										const jaccard = item.jaccard;
										// Color code based on strength
										let badgeColor = '#2563eb'; // default blue
										let bgColor = 'rgba(37, 99, 235, 0.1)';
										if (jaccard >= 0.8) {
											badgeColor = '#10b981'; // green for strong
											bgColor = 'rgba(16, 185, 129, 0.1)';
										} else if (jaccard <= 0.3) {
											badgeColor = '#f59e0b'; // orange for weak
											bgColor = 'rgba(245, 158, 11, 0.1)';
										}

										return (
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
														background: bgColor,
														color: badgeColor,
														padding:
															'0.2rem 0.5rem',
														borderRadius: '4px',
														fontSize: '0.75rem',
														marginLeft: '0.75rem',
														fontWeight: 600,
													}}
												>
													{jaccard.toFixed(2)}
												</span>
											</div>
										);
									})}
							</div>
						</div>
					)}

				{/* Concept Co-occurrence Graph */}
				{spreadData?.co_occurrence &&
					spreadData.co_occurrence.length > 0 && (
						<ConceptCooccurrenceGraph
							cooccurrenceData={spreadData.co_occurrence}
						/>
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
									marginBottom: '0.5rem',
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
								Sequential concept flow in agent communications
								(from → to). High-frequency transitions reveal
								persuasion pathways, framing strategies, and
								logical bridges agents use to connect ideas.
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
									(trans, i) => {
										// Color code based on frequency
										let intensity = Math.min(
											trans.count / 5,
											1,
										); // normalize
										let hue = 220; // blue hue
										let bgOpacity = 0.05 + intensity * 0.15;

										return (
											<div
												key={i}
												style={{
													display: 'flex',
													alignItems: 'center',
													justifyContent:
														'space-between',
													background:
														'var(--surface-container)',
													padding: '0.75rem',
													borderRadius: '8px',
													border: `1px solid var(--outline-variant)`,
													position: 'relative',
													overflow: 'hidden',
												}}
											>
												<div
													style={{
														position: 'absolute',
														top: 0,
														left: 0,
														right: 0,
														bottom: 0,
														background: `hsla(${hue}, 70%, 50%, ${bgOpacity})`,
														pointerEvents: 'none',
													}}
												/>
												<div
													style={{
														display: 'flex',
														alignItems: 'center',
														gap: '0.5rem',
														flex: 1,
														minWidth: 0,
														position: 'relative',
													}}
												>
													<span
														style={{
															fontWeight: 600,
															fontSize: '0.85rem',
															color: 'var(--accent-color)',
															whiteSpace:
																'nowrap',
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
															whiteSpace:
																'nowrap',
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
														padding:
															'0.2rem 0.5rem',
														borderRadius: '4px',
														fontSize: '0.75rem',
														fontWeight: 600,
														marginLeft: '0.5rem',
													}}
												>
													×{trans.count}
												</span>
											</div>
										);
									},
								)}
							</div>
						</div>
					)}

				{/* Narrative Transitions Graph */}
				{narrativeData?.top_transitions &&
					narrativeData.top_transitions.length > 0 && (
						<NarrativeTransitionsGraph
							narrativeData={narrativeData}
						/>
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
				position: 'relative',
			}}
		>
			{/* Loading overlay when generating metrics */}
			{generating && (
				<div
					style={{
						position: 'absolute',
						top: 0,
						left: 0,
						right: 0,
						bottom: 0,
						background: 'rgba(0, 0, 0, 0.75)',
						backdropFilter: 'blur(4px)',
						display: 'flex',
						flexDirection: 'column',
						alignItems: 'center',
						justifyContent: 'center',
						zIndex: 1000,
						borderRadius: '12px',
					}}
				>
					<div
						style={{
							background: 'var(--surface-container-low)',
							padding: '2rem 3rem',
							borderRadius: '12px',
							textAlign: 'center',
							boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
						}}
					>
						<RefreshCw
							size={48}
							color="var(--accent-color)"
							className="animate-spin"
							style={{ marginBottom: '1rem' }}
						/>
						<h3
							style={{
								fontSize: '1.3rem',
								fontWeight: 700,
								margin: '0 0 0.5rem 0',
							}}
						>
							Generating Metrics...
						</h3>
						<p
							style={{
								color: 'var(--text-secondary)',
								margin: 0,
								fontSize: '0.9rem',
							}}
						>
							Analyzing behavioral patterns and network
							dynamics...
						</p>
					</div>
				</div>
			)}

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

			<div
				style={{
					flex: 1,
					minHeight: 0,
					display: 'flex',
					flexDirection: 'column',
					gap: '3rem',
					paddingBottom: '2rem',
				}}
			>
				<div>
					<h3
						style={{
							fontSize: '1.2rem',
							marginBottom: '1.5rem',
							display: 'flex',
							alignItems: 'center',
							gap: '0.5rem',
						}}
					>
						<Info size={20} /> Overview
					</h3>
					{renderOverviewTab()}
				</div>
				{spreadData && <div>{renderContentTab()}</div>}
			</div>
		</div>
	);
}
