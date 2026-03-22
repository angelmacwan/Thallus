import React from 'react';
import {
	BrowserRouter as Router,
	Routes,
	Route,
	Navigate,
} from 'react-router-dom';
import Auth from './views/Auth';
import Home from './views/Home';
import SessionView from './views/Session';

const PrivateRoute = ({ children }) => {
	const token = localStorage.getItem('token');
	return token ? children : <Navigate to="/login" />;
};

function App() {
	return (
		<Router>
			<div className="app-container">
				<header className="navbar">
					<div className="navbar-brand">
						<span
							style={{
								color: 'var(--accent-color)',
								fontWeight: 800,
								letterSpacing: '-1px',
							}}
						>
							Thallus
						</span>
					</div>
					<div>
						{localStorage.getItem('token') && (
							<button
								className="btn btn-secondary"
								onClick={() => {
									localStorage.removeItem('token');
									window.location.href = '/login';
								}}
							>
								Logout
							</button>
						)}
					</div>
				</header>

				<main className="content">
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
					</Routes>
				</main>
			</div>
		</Router>
	);
}

export default App;
