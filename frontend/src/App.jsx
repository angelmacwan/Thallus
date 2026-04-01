import React, { useState, useEffect, useRef } from 'react';
import {
	BrowserRouter as Router,
	Routes,
	Route,
	Navigate,
	useNavigate,
	useLocation,
} from 'react-router-dom';
import api from './api';
import {
	Settings,
	LayoutList,
	FileText,
	LogOut,
	ArrowLeft,
	Users,
	Link2,
	Info,
	PlusSquare,
	Rss,
	FlaskConical,
	Sparkles,
	RefreshCw,
	AlertTriangle,
	FolderOpen,
	CheckCircle2,
	Loader,
	XCircle,
	UserCircle,
	ChevronUp,
	X,
	Target,
	BookOpen,
	Briefcase,
	GraduationCap,
	UploadCloud,
	Zap,
} from 'lucide-react';
import { SidebarCtx } from './SidebarContext';
import Auth from './views/Auth';
import Home from './views/Home';
import SessionView from './views/Session';
import NewSimulationModal from './components/NewSimulationModal';

function InfoModal({ open, onClose }) {
	if (!open) return null;
	return (
		<div
			style={{
				position: 'fixed',
				inset: 0,
				background: 'rgba(0,0,0,0.35)',
				backdropFilter: 'blur(4px)',
				WebkitBackdropFilter: 'blur(4px)',
				zIndex: 2000,
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
					maxWidth: '580px',
					maxHeight: '85vh',
					overflowY: 'auto',
					padding: '2rem',
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
						marginBottom: '1.5rem',
					}}
				>
					<div>
						<h2
							style={{
								margin: 0,
								fontSize: '1.3rem',
								fontWeight: 700,
							}}
						>
							About Thallus
						</h2>
						<p
							style={{
								margin: '0.3rem 0 0',
								fontSize: '0.85rem',
								color: 'var(--text-secondary)',
							}}
						>
							AI-powered simulation & deliberation engine
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

				{/* What it does */}
				<p
					style={{
						fontSize: '0.88rem',
						color: 'var(--text-secondary)',
						lineHeight: 1.65,
						marginBottom: '1.5rem',
					}}
				>
					Thallus runs multi-agent AI simulations over your documents.
					You upload seed material, define an objective, and a
					configurable team of AI agents deliberates across multiple
					rounds — surfacing insights, tensions, and conclusions that
					a single model would miss.
				</p>

				{/* How it works */}
				<h3
					style={{
						fontSize: '0.72rem',
						fontWeight: 700,
						letterSpacing: '0.1em',
						textTransform: 'uppercase',
						color: 'var(--text-secondary)',
						marginBottom: '0.75rem',
					}}
				>
					How it works
				</h3>
				<div
					style={{
						display: 'flex',
						flexDirection: 'column',
						gap: '0.6rem',
						marginBottom: '1.5rem',
					}}
				>
					{[
						{
							icon: UploadCloud,
							step: '01',
							title: 'Upload Seeds',
							body: 'Drop in documents — reports, papers, briefs, or notes — as the starting context.',
						},
						{
							icon: Zap,
							step: '02',
							title: 'Agents Deliberate',
							body: 'AI agents read, challenge, and synthesize your material across multiple reasoning rounds.',
						},
						{
							icon: FileText,
							step: '03',
							title: 'Get a Report',
							body: 'Receive a structured report capturing insights, tensions, and conclusions.',
						},
					].map(({ icon: Icon, step, title, body }) => (
						<div
							key={step}
							style={{
								display: 'flex',
								gap: '0.85rem',
								alignItems: 'flex-start',
								padding: '0.75rem',
								borderRadius: '10px',
								background: 'var(--surface-container-high)',
							}}
						>
							<div
								style={{
									display: 'flex',
									alignItems: 'center',
									gap: '0.4rem',
									minWidth: '3.5rem',
								}}
							>
								<Icon
									size={14}
									color="var(--accent-color)"
								/>
								<span
									style={{
										fontSize: '0.65rem',
										fontWeight: 700,
										color: 'var(--accent-color)',
										letterSpacing: '0.07em',
									}}
								>
									{step}
								</span>
							</div>
							<div>
								<p
									style={{
										margin: 0,
										fontWeight: 600,
										fontSize: '0.85rem',
									}}
								>
									{title}
								</p>
								<p
									style={{
										margin: '0.2rem 0 0',
										fontSize: '0.78rem',
										color: 'var(--text-secondary)',
										lineHeight: 1.5,
									}}
								>
									{body}
								</p>
							</div>
						</div>
					))}
				</div>

				{/* Use cases */}
				<h3
					style={{
						fontSize: '0.72rem',
						fontWeight: 700,
						letterSpacing: '0.1em',
						textTransform: 'uppercase',
						color: 'var(--text-secondary)',
						marginBottom: '0.75rem',
					}}
				>
					Useful for
				</h3>
				<div
					style={{
						display: 'grid',
						gridTemplateColumns: '1fr 1fr',
						gap: '0.6rem',
					}}
				>
					{[
						{
							icon: Target,
							title: 'Strategic Planning',
							body: 'Model stakeholder reactions to policy, market, or product decisions before you commit.',
						},
						{
							icon: BookOpen,
							title: 'Research Synthesis',
							body: 'Surface tensions, agreements, and blind spots across competing sources.',
						},
						{
							icon: Briefcase,
							title: 'Consulting & Briefings',
							body: 'Turn dense client briefs into structured deliberation and polished reports.',
						},
						{
							icon: GraduationCap,
							title: 'Education & Training',
							body: 'Simulate expert panels to create learning materials or stress-test arguments.',
						},
					].map(({ icon: Icon, title, body }) => (
						<div
							key={title}
							style={{
								padding: '0.85rem',
								borderRadius: '10px',
								background: 'var(--surface-container-high)',
							}}
						>
							<div
								style={{
									display: 'flex',
									alignItems: 'center',
									gap: '0.4rem',
									marginBottom: '0.35rem',
								}}
							>
								<Icon
									size={14}
									color="var(--accent-color)"
								/>
								<p
									style={{
										margin: 0,
										fontWeight: 600,
										fontSize: '0.82rem',
									}}
								>
									{title}
								</p>
							</div>
							<p
								style={{
									margin: 0,
									fontSize: '0.75rem',
									color: 'var(--text-secondary)',
									lineHeight: 1.5,
								}}
							>
								{body}
							</p>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}

const PrivateRoute = ({ children }) => {
	const token = localStorage.getItem('token');
	return token ? children : <Navigate to="/login" />;
};

function SidebarSessionList({ navigate }) {
	const [sessions, setSessions] = useState([]);

	useEffect(() => {
		api.get('/sessions/')
			.then((res) => setSessions(res.data))
			.catch(() => {});
	}, []);

	if (sessions.length === 0) return null;

	return (
		<div style={{ marginTop: '0.25rem' }}>
			{sessions.map((s) => {
				const statusIcon =
					s.status === 'completed' ? (
						<CheckCircle2
							size={13}
							color="#16a34a"
							style={{ flexShrink: 0 }}
						/>
					) : s.status === 'error' ? (
						<XCircle
							size={13}
							color="#dc2626"
							style={{ flexShrink: 0 }}
						/>
					) : (
						<Loader
							size={13}
							color="#2563eb"
							style={{ flexShrink: 0 }}
						/>
					);
				return (
					<button
						key={s.id}
						className="sidebar-nav-btn"
						onClick={() => navigate(`/session/${s.session_id}`)}
						style={{ padding: '0.5rem 0.85rem', gap: '0.5rem' }}
					>
						{statusIcon}
						<span
							style={{
								fontWeight: 500,
								fontSize: '0.8rem',
								overflow: 'hidden',
								textOverflow: 'ellipsis',
								whiteSpace: 'nowrap',
							}}
						>
							{s.title || `Simulation #${s.id}`}
						</span>
					</button>
				);
			})}
		</div>
	);
}

function Sidebar() {
	const navigate = useNavigate();
	const location = useLocation();
	const { sessionNav, setNewSimOpen } = React.useContext(SidebarCtx);
	const [profileOpen, setProfileOpen] = useState(false);
	const [infoOpen, setInfoOpen] = useState(false);
	const profileRef = useRef(null);

	// Decode email from JWT
	const email = (() => {
		try {
			const token = localStorage.getItem('token');
			if (!token) return '';
			const payload = JSON.parse(atob(token.split('.')[1]));
			return payload.sub || payload.email || '';
		} catch {
			return '';
		}
	})();

	// Close dropdown on outside click
	useEffect(() => {
		const handler = (e) => {
			if (profileRef.current && !profileRef.current.contains(e.target)) {
				setProfileOpen(false);
			}
		};
		document.addEventListener('mousedown', handler);
		return () => document.removeEventListener('mousedown', handler);
	}, []);

	const logout = () => {
		localStorage.removeItem('token');
		window.location.href = '/login';
	};

	return (
		<>
			<aside className="sidebar">
				{/* Logo */}
				<div className="sidebar-logo">
					<div className="sidebar-logo-icon">
						<Settings size={18} />
					</div>
					<div>
						<div className="sidebar-brand-name">Thallus</div>
						<div className="sidebar-brand-sub">
							Simulation Engine
						</div>
					</div>
				</div>

				{/* Nav */}
				<nav
					className="sidebar-nav"
					style={{ flex: 1 }}
				>
					{sessionNav ? (
						<>
							<button
								className="sidebar-nav-btn"
								onClick={() => navigate('/')}
							>
								<ArrowLeft size={15} />
								Back
							</button>
							<div
								style={{
									height: '1px',
									background: 'var(--outline-variant)',
									margin: '0.5rem 0.85rem',
								}}
							/>
							{/* Nav buttons + action buttons — only when completed or errored */}
							{(sessionNav.session?.status === 'completed' ||
								sessionNav.session?.status === 'error') && (
								<>
									{[
										{
											id: 'feed',
											icon: <Rss size={15} />,
											label: 'Feed',
											completedOnly: true,
										},
										{
											id: 'scenarios',
											icon: <FlaskConical size={15} />,
											label: `Scenarios${sessionNav.scenariosCount ? ` (${sessionNav.scenariosCount})` : ''}`,
											completedOnly: true,
										},
										{
											id: 'seed_data',
											icon: <FolderOpen size={15} />,
											label: 'Seed Data',
										},
										{
											id: 'agents',
											icon: <Users size={15} />,
											label: `Agents${sessionNav.agentCount ? ` (${sessionNav.agentCount})` : ''}`,
										},
										{
											id: 'relations',
											icon: <Link2 size={15} />,
											label: `Relations${sessionNav.relationCount ? ` (${sessionNav.relationCount})` : ''}`,
										},
										{
											id: 'info',
											icon: <Info size={15} />,
											label: 'Info',
										},
										{
											id: 'reports',
											icon: <FileText size={15} />,
											label: `Reports${sessionNav.reportsCount ? ` (${sessionNav.reportsCount})` : ''}`,
										},
										{
											id: 'insights',
											icon: <Sparkles size={15} />,
											label: 'Insights',
											completedOnly: true,
										},
									]
										.filter(
											(item) =>
												!item.completedOnly ||
												sessionNav.session?.status ===
													'completed',
										)
										.map((item) => (
											<button
												key={item.id}
												className={`sidebar-nav-btn${sessionNav.activeTab === item.id ? ' active' : ''}`}
												onClick={() =>
													sessionNav.setActiveTab(
														item.id,
													)
												}
											>
												{item.icon}
												{item.label}
											</button>
										))}
									{/* Resimulate button */}
									{sessionNav.onResimulate &&
										(() => {
											const isFailed =
												sessionNav.session?.status ===
												'error';
											return (
												<>
													{!sessionNav.onCreateReport && (
														<div
															style={{
																height: '1px',
																background:
																	'var(--outline-variant)',
																margin: '0.5rem 0.85rem',
															}}
														/>
													)}
													<button
														className="sidebar-nav-btn"
														onClick={
															sessionNav.onResimulate
														}
														style={{
															color: isFailed
																? '#d97706'
																: 'var(--text-secondary)',
															fontWeight: isFailed
																? 700
																: 500,
														}}
													>
														{isFailed ? (
															<AlertTriangle
																size={15}
															/>
														) : (
															<RefreshCw
																size={15}
															/>
														)}
														{isFailed
															? 'Retry Simulation'
															: 'Resimulate'}
													</button>
												</>
											);
										})()}
								</>
							)}
							{/* Session info card — always visible */}
							{sessionNav.session &&
								(() => {
									const status =
										sessionNav.session.status?.toLowerCase();
									const statusColors = {
										completed: {
											bg: '#dcfce7',
											color: '#16a34a',
										},
										running: {
											bg: '#dbeafe',
											color: '#2563eb',
										},
										error: {
											bg: '#fee2e2',
											color: '#dc2626',
										},
										pending: {
											bg: '#fef9c3',
											color: '#ca8a04',
										},
									};
									const pill = statusColors[status] || {
										bg: '#e5e7eb',
										color: '#374151',
									};

									return (
										<div
											style={{
												margin: '0.75rem 0.85rem 0',
												padding: '0.65rem 0.75rem',
												background: '#E3EBF6',
												borderRadius: '8px',
											}}
										>
											{[
												{
													label: 'Session ID',
													value: sessionNav.session
														.id,
												},
												{
													label: 'Created',
													value: sessionNav.session
														.created_at
														? new Date(
																sessionNav
																	.session
																	.created_at,
															).toLocaleString()
														: '—',
												},
											].map(({ label, value }) => (
												<div
													key={label}
													style={{
														marginBottom: '0.45rem',
													}}
												>
													<div
														style={{
															fontSize: '0.65rem',
															fontWeight: 700,
															textTransform:
																'uppercase',
															letterSpacing:
																'0.05em',
															color: 'var(--text-secondary)',
															marginBottom:
																'0.1rem',
														}}
													>
														{label}
													</div>
													<div
														style={{
															fontSize: '0.72rem',
															color: 'var(--text-primary)',
															wordBreak:
																'break-all',
														}}
													>
														{value}
													</div>
												</div>
											))}
											{/* Status pill */}
											<div
												style={{
													marginBottom: '0.45rem',
												}}
											>
												<div
													style={{
														fontSize: '0.65rem',
														fontWeight: 700,
														textTransform:
															'uppercase',
														letterSpacing: '0.05em',
														color: 'var(--text-secondary)',
														marginBottom: '0.3rem',
													}}
												>
													Status
												</div>
												<span
													style={{
														display: 'inline-block',
														padding:
															'0.15rem 0.55rem',
														borderRadius: '999px',
														fontSize: '0.68rem',
														fontWeight: 700,
														background: pill.bg,
														color: pill.color,
														textTransform:
															'uppercase',
														letterSpacing: '0.04em',
													}}
												>
													{sessionNav.session.status?.toUpperCase()}
												</span>
											</div>
										</div>
									);
								})()}
						</>
					) : (
						<>
							<SidebarSessionList navigate={navigate} />
						</>
					)}
				</nav>

				{/* User profile */}
				<div
					ref={profileRef}
					style={{ position: 'relative', margin: '0 0.5rem 0.5rem' }}
				>
					{/* Dropdown */}
					{profileOpen && (
						<div
							style={{
								position: 'absolute',
								bottom: 'calc(100% + 6px)',
								left: 0,
								right: 0,
								background: 'var(--surface-container-high)',
								border: '1px solid var(--outline-variant)',
								borderRadius: '10px',
								overflow: 'hidden',
								boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
								zIndex: 100,
							}}
						>
							<button
								className="sidebar-nav-btn"
								onClick={() => {
									setInfoOpen(true);
									setProfileOpen(false);
								}}
								style={{ width: '100%', borderRadius: 0 }}
							>
								<Info size={14} />
								About Thallus
							</button>
							<div
								style={{
									height: '1px',
									background: 'var(--outline-variant)',
								}}
							/>
							<button
								className="sidebar-nav-btn"
								onClick={() => setProfileOpen(false)}
								style={{ width: '100%', borderRadius: 0 }}
							>
								<Settings size={14} />
								Settings
							</button>
							<div
								style={{
									height: '1px',
									background: 'var(--outline-variant)',
								}}
							/>
							<button
								className="sidebar-nav-btn danger"
								onClick={logout}
								style={{ width: '100%', borderRadius: 0 }}
							>
								<LogOut size={14} />
								Logout
							</button>
						</div>
					)}
					{/* Trigger button */}
					<button
						onClick={() => setProfileOpen((o) => !o)}
						style={{
							width: '100%',
							display: 'flex',
							alignItems: 'center',
							gap: '0.5rem',
							padding: '0.55rem 0.75rem',
							borderRadius: '8px',
							border: '1px solid var(--outline-variant)',
							background: profileOpen
								? 'var(--surface-container-high)'
								: 'transparent',
							cursor: 'pointer',
							color: 'var(--text-primary)',
							transition: 'background 0.15s ease',
						}}
					>
						<UserCircle
							size={16}
							color="var(--text-secondary)"
							style={{ flexShrink: 0 }}
						/>
						<span
							style={{
								flex: 1,
								fontSize: '0.75rem',
								fontWeight: 500,
								overflow: 'hidden',
								textOverflow: 'ellipsis',
								whiteSpace: 'nowrap',
								textAlign: 'left',
								color: 'var(--text-secondary)',
							}}
						>
							{email || 'Account'}
						</span>
						<ChevronUp
							size={13}
							color="var(--text-secondary)"
							style={{
								flexShrink: 0,
								transform: profileOpen
									? 'rotate(0deg)'
									: 'rotate(180deg)',
								transition: 'transform 0.2s ease',
							}}
						/>
					</button>
				</div>
			</aside>
			<InfoModal
				open={infoOpen}
				onClose={() => setInfoOpen(false)}
			/>
		</>
	);
}

function AppLayout() {
	const location = useLocation();
	const isAuth = location.pathname === '/login';
	const token = localStorage.getItem('token');
	const showSidebar = !!token && !isAuth;
	const [sessionNav, setSessionNav] = useState(null);
	const [newSimOpen, setNewSimOpen] = useState(false);

	return (
		<SidebarCtx.Provider
			value={{ sessionNav, setSessionNav, newSimOpen, setNewSimOpen }}
		>
			<div
				style={{
					display: 'flex',
					height: '100vh',
					background: 'var(--surface)',
				}}
			>
				{showSidebar && <Sidebar />}
				<NewSimulationModal
					open={newSimOpen}
					onClose={() => setNewSimOpen(false)}
				/>
				<main
					className="main-content"
					style={!showSidebar ? { padding: 0 } : undefined}
				>
					<Routes>
						<Route
							path="/login"
							element={<Auth />}
						/>
						<Route
							path="/"
							element={
								<PrivateRoute>
									<Home />
								</PrivateRoute>
							}
						/>
						<Route
							path="/session/:id"
							element={
								<PrivateRoute>
									<SessionView />
								</PrivateRoute>
							}
						/>
						<Route
							path="*"
							element={<Navigate to="/" />}
						/>
					</Routes>
				</main>
			</div>
		</SidebarCtx.Provider>
	);
}

function App() {
	return (
		<Router>
			<AppLayout />
		</Router>
	);
}

export default App;
