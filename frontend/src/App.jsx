import React, { useState } from 'react';
import {
	BrowserRouter as Router,
	Routes,
	Route,
	Navigate,
	useNavigate,
	useLocation,
} from 'react-router-dom';
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
	BarChart2,
	RefreshCw,
	AlertTriangle,
} from 'lucide-react';
import { SidebarCtx } from './SidebarContext';
import Auth from './views/Auth';
import Home from './views/Home';
import SessionView from './views/Session';
import Reports from './views/Reports';

const PrivateRoute = ({ children }) => {
	const token = localStorage.getItem('token');
	return token ? children : <Navigate to="/login" />;
};

function Sidebar() {
	const navigate = useNavigate();
	const location = useLocation();
	const { sessionNav } = React.useContext(SidebarCtx);

	const logout = () => {
		localStorage.removeItem('token');
		window.location.href = '/login';
	};

	return (
		<aside className="sidebar">
			{/* Logo */}
			<div className="sidebar-logo">
				<div className="sidebar-logo-icon">
					<Settings size={18} />
				</div>
				<div>
					<div className="sidebar-brand-name">Thallus</div>
					<div className="sidebar-brand-sub">Simulation Engine</div>
				</div>
			</div>

			{/* Nav */}
			<nav className="sidebar-nav">
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
								id: 'metrics',
								icon: <BarChart2 size={15} />,
								label: 'Metrics',
								completedOnly: true,
							},
						]
							.filter(
								(item) =>
									!item.completedOnly ||
									sessionNav.session?.status === 'completed',
							)
							.map((item) => (
								<button
									key={item.id}
									className={`sidebar-nav-btn${sessionNav.activeTab === item.id ? ' active' : ''}`}
									onClick={() =>
										sessionNav.setActiveTab(item.id)
									}
								>
									{item.icon}
									{item.label}
								</button>
							))}
						{/* Generate Report button – only for completed sessions */}
						{sessionNav.onCreateReport && (
							<>
								<div
									style={{
										height: '1px',
										background: 'var(--outline-variant)',
										margin: '0.5rem 0.85rem',
									}}
								/>
								<button
									className="sidebar-nav-btn"
									onClick={sessionNav.onCreateReport}
									style={{
										color: 'var(--accent-color)',
										fontWeight: 700,
									}}
								>
									<PlusSquare size={15} />
									Generate Report
								</button>
							</>
						)}
						{/* Resimulate button – for completed or failed sessions */}
						{sessionNav.onResimulate &&
							(() => {
								const isFailed =
									sessionNav.session?.status === 'error';
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
											onClick={sessionNav.onResimulate}
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
												<AlertTriangle size={15} />
											) : (
												<RefreshCw size={15} />
											)}
											{isFailed
												? 'Retry Simulation'
												: 'Resimulate'}
										</button>
									</>
								);
							})()}
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
									error: { bg: '#fee2e2', color: '#dc2626' },
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
										{/* Session ID */}
										{[
											{
												label: 'Session ID',
												value: sessionNav.session.id,
											},
											{
												label: 'Created',
												value: sessionNav.session
													.created_at
													? new Date(
															sessionNav.session
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
														letterSpacing: '0.05em',
														color: 'var(--text-secondary)',
														marginBottom: '0.1rem',
													}}
												>
													{label}
												</div>
												<div
													style={{
														fontSize: '0.72rem',
														color: 'var(--text-primary)',
														wordBreak: 'break-all',
													}}
												>
													{value}
												</div>
											</div>
										))}
										{/* Status pill */}
										<div
											style={{ marginBottom: '0.45rem' }}
										>
											<div
												style={{
													fontSize: '0.65rem',
													fontWeight: 700,
													textTransform: 'uppercase',
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
													padding: '0.15rem 0.55rem',
													borderRadius: '999px',
													fontSize: '0.68rem',
													fontWeight: 700,
													background: pill.bg,
													color: pill.color,
													textTransform: 'uppercase',
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
						<button
							className={`sidebar-nav-btn${location.pathname === '/' ? ' active' : ''}`}
							onClick={() => navigate('/')}
						>
							<LayoutList size={15} />
							Simulations
						</button>
						<button
							className={`sidebar-nav-btn${location.pathname === '/reports' ? ' active' : ''}`}
							onClick={() => navigate('/reports')}
						>
							<FileText size={15} />
							Reports
						</button>
					</>
				)}
			</nav>

			{/* Logout */}
			<div style={{ marginTop: 'auto' }}>
				<button
					className="sidebar-nav-btn danger"
					onClick={logout}
				>
					<LogOut size={15} />
					Logout
				</button>
			</div>
		</aside>
	);
}

function AppLayout() {
	const location = useLocation();
	const isAuth = location.pathname === '/login';
	const token = localStorage.getItem('token');
	const showSidebar = !!token && !isAuth;
	const [sessionNav, setSessionNav] = useState(null);

	return (
		<SidebarCtx.Provider value={{ sessionNav, setSessionNav }}>
			<div
				style={{
					display: 'flex',
					height: '100vh',
					background: 'var(--surface)',
				}}
			>
				{showSidebar && <Sidebar />}
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
							path="/reports"
							element={
								<PrivateRoute>
									<Reports />
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
